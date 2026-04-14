import WebSocket, { WebSocketServer } from 'ws';
import { URL } from 'node:url';
import pool from '../config/database.js';
import { verifyToken } from '../utils/jwt.js';
import { getLogger } from '../lib/logger.js';

const logger = getLogger();

const MAX_GLOBAL_SESSIONS = 64;
const MAX_SESSIONS_PER_USER = 4;
const MAX_SESSIONS_PER_ORDER = 1;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const COMMAND_WINDOW_MS = 2000;
const COMMANDS_PER_WINDOW = 10;
const MAX_MESSAGE_BYTES = 4096;
const PANEL_CLIENT_KEY = (process.env.PTERO_CLIENT_KEY || '').trim();
const PANEL_URL = (process.env.PANEL_URL || '').trim();
const PANEL_RATE_LIMIT_COOLDOWN_MS = 120000;
const PANEL_OPEN_TIMEOUT_MS = 20000;
/** Browser→API pings so nginx/proxies do not treat the console stream as idle and RST it. */
const CLIENT_WS_PING_MS = 25000;
/**
 * Reuse Panel websocket credentials for a short window so reconnects (and duplicate tabs) do not
 * hammer GET /api/client/servers/:id/websocket (Panel throttles this heavily → 429).
 * Invalidate sooner when the Panel emits token expiring/expired.
 */
const WS_CRED_CACHE_MS = Math.max(
  5000,
  Number.parseInt(String(process.env.PTERO_WS_TOKEN_CACHE_MS || '45000'), 10) || 45000
);

const wsCredCache = new Map(); // ptero_identifier -> { token, socketUrl, expiresAt }

function peekCachedWsCreds(identifier) {
  const id = String(identifier);
  const row = wsCredCache.get(id);
  if (!row || row.expiresAt <= Date.now()) return null;
  return { token: row.token, socketUrl: row.socketUrl };
}

function setCachedWsCreds(identifier, token, socketUrl) {
  const id = String(identifier);
  wsCredCache.set(id, {
    token,
    socketUrl,
    expiresAt: Date.now() + WS_CRED_CACHE_MS,
  });
}

function invalidateWsCredCache(identifier) {
  wsCredCache.delete(String(identifier));
}

/** Serialize panel token HTTP calls per server so tabs/users don't stampede the Panel rate limiter. */
const panelTokenMutexByIdentifier = new Map();
const panelTokenBackoffUntil = new Map();

function getPanelTokenMutex(identifier) {
  const key = String(identifier);
  let mutex = panelTokenMutexByIdentifier.get(key);
  if (!mutex) {
    let chain = Promise.resolve();
    mutex = (fn) => {
      const run = chain.then(() => fn());
      chain = run.catch(() => {}).then(() => {});
      return run;
    };
    panelTokenMutexByIdentifier.set(key, mutex);
  }
  return mutex;
}

function isPanelRateLimitedStatus(status, text) {
  if (status === 429) return true;
  const raw = String(text || '').toLowerCase();
  return raw.includes('too many attempts') || raw.includes('throttlerequestsexception');
}

function isPanelRateLimitedError(err) {
  const raw = String(err?.message || err || '').toLowerCase();
  return raw.includes('429') || raw.includes('too many attempts') || raw.includes('throttlerequestsexception');
}

const sessionsByUser = new Map(); // userId -> count
const sessionsByOrder = new Map(); // orderId -> count
let globalSessions = 0;

function inc(map, key) {
  const k = String(key);
  map.set(k, (map.get(k) || 0) + 1);
}

function dec(map, key) {
  const k = String(key);
  const current = map.get(k) || 0;
  if (current <= 1) map.delete(k);
  else map.set(k, current - 1);
}

function extractOrderIdFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    // Expect: /ws/servers/:orderId/console
    if (parts.length === 4 && parts[0] === 'ws' && parts[1] === 'servers' && parts[3] === 'console') {
      return decodeURIComponent(parts[2]);
    }
  } catch {
    // ignore
  }
  return null;
}

function extractTokenFromUrlOrHeaders(rawUrl, headers) {
  try {
    const url = new URL(rawUrl, 'http://localhost');
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) return tokenFromQuery;
  } catch {
    // ignore
  }
  const auth = headers?.authorization || headers?.Authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  return null;
}

async function getUserOrder(orderId, userId) {
  const [rows] = await pool.execute(
    `SELECT
       o.id,
       o.user_id,
       o.status,
       o.item_type,
       o.region,
       o.server_name,
       o.ptero_server_id,
       o.ptero_identifier
     FROM orders o
     WHERE o.id = ? AND o.user_id = ? AND o.item_type = 'game'
     LIMIT 1`,
    [orderId, userId]
  );
  return rows?.[0] || null;
}

async function fetchPanelWebsocketCredentials(order) {
  const id = String(order.ptero_identifier);
  const cached = peekCachedWsCreds(id);
  if (cached) return cached;

  const run = getPanelTokenMutex(id);
  return run(async () => {
    const hit = peekCachedWsCreds(id);
    if (hit) return hit;

    const until = panelTokenBackoffUntil.get(id) || 0;
    const delayMs = until - Date.now();
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    const base = String(PANEL_URL).replace(/\/+$/, '');
    const res = await fetch(
      `${base}/api/client/servers/${encodeURIComponent(order.ptero_identifier)}/websocket`,
      {
        headers: {
          Authorization: `Bearer ${PANEL_CLIENT_KEY}`,
          Accept: 'application/json',
        },
      }
    );

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      if (isPanelRateLimitedStatus(res.status, text)) {
        panelTokenBackoffUntil.set(id, Date.now() + PANEL_RATE_LIMIT_COOLDOWN_MS);
      }
      invalidateWsCredCache(id);
      throw new Error(`Failed to obtain panel websocket token (${res.status}): ${text}`);
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      invalidateWsCredCache(id);
      throw new Error('Panel websocket response was not valid JSON');
    }
    const token = body?.data?.token || body?.token;
    const socketUrl = body?.data?.socket || body?.socket;
    if (!token || !socketUrl) {
      invalidateWsCredCache(id);
      throw new Error('Panel websocket response missing token or socket URL');
    }
    setCachedWsCreds(id, token, socketUrl);
    return { token, socketUrl };
  });
}

async function createPanelSocket(order, onMessage, onClose) {
  if (!PANEL_URL || !PANEL_CLIENT_KEY || !order.ptero_identifier) {
    throw new Error('Panel client API not configured for console streaming');
  }

  const { token, socketUrl } = await fetchPanelWebsocketCredentials(order);

  return new Promise((resolve, reject) => {
    const panelWs = new WebSocket(socketUrl);
    let settled = false;
    let connected = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(openTimer);
      try {
        panelWs.close();
      } catch {
        // ignore
      }
      reject(err);
    };

    const openTimer = setTimeout(() => {
      fail(new Error('Panel websocket open timeout'));
    }, PANEL_OPEN_TIMEOUT_MS);

    panelWs.onopen = () => {
      clearTimeout(openTimer);
      try {
        panelWs.send(JSON.stringify({ event: 'auth', args: [token] }));
      } catch (err) {
        fail(err);
        return;
      }
      if (!settled) {
        settled = true;
        connected = true;
        resolve(panelWs);
      }
    };

    panelWs.onmessage = (event) => {
      onMessage(event.data);
    };

    panelWs.onclose = () => {
      clearTimeout(openTimer);
      if (connected) {
        onClose();
      } else if (!settled) {
        settled = true;
        reject(new Error('Panel websocket closed before ready'));
      }
    };

    panelWs.onerror = () => {
      fail(new Error('Panel websocket connection error'));
    };
  });
}

export function attachConsoleWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    try {
      const url = request.url || '';
      const orderId = extractOrderIdFromUrl(url);
      if (!orderId) {
        socket.destroy();
        return;
      }

      const token = extractTokenFromUrlOrHeaders(url, request.headers || {});
      const decoded = token ? verifyToken(token) : null;
      const userId = decoded?.userId || decoded?.id;
      if (!userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      if (globalSessions >= MAX_GLOBAL_SESSIONS) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      const userCount = sessionsByUser.get(String(userId)) || 0;
      if (userCount >= MAX_SESSIONS_PER_USER) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      const order = await getUserOrder(orderId, userId);
      if (!order || order.ptero_identifier == null) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, { userId, order });
      });
    } catch (err) {
      logger.error({ err }, 'WebSocket upgrade error for console');
      try {
        socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n');
      } catch {
        // ignore
      }
      socket.destroy();
    }
  });

  wss.on('connection', (ws, context) => {
    const { userId, order } = context;
    const orderId = String(order.id);
    const userKey = String(userId);

    globalSessions += 1;
    inc(sessionsByUser, userKey);
    inc(sessionsByOrder, orderId);

    const meta = {
      userId,
      orderId,
      lastActivity: Date.now(),
      commandWindowStart: Date.now(),
      commandCount: 0,
      closed: false,
      panelWs: null,
      reconnectAttempts: 0,
      panelConnectInFlight: false,
      lastRateLimitNoticeAt: 0,
    };

    const idleTimer = setInterval(() => {
      const now = Date.now();
      if (now - meta.lastActivity > IDLE_TIMEOUT_MS) {
        safeSend(ws, {
          type: 'console.idle_timeout',
          message: 'Console session closed due to inactivity.',
        });
        ws.close(1000, 'idle timeout');
      }
    }, 30000);

    const clientPingTimer = setInterval(() => {
      try {
        if (ws.readyState === ws.OPEN) ws.ping();
      } catch {
        // ignore
      }
    }, CLIENT_WS_PING_MS);

    function cleanup() {
      if (meta.closed) return;
      meta.closed = true;

      globalSessions = Math.max(0, globalSessions - 1);
      dec(sessionsByUser, userKey);
      dec(sessionsByOrder, orderId);

      clearInterval(idleTimer);
      clearInterval(clientPingTimer);

      if (meta.panelWs && meta.panelWs.readyState === meta.panelWs.OPEN) {
        try {
          meta.panelWs.close();
        } catch {
          // ignore
        }
      }
    }

    ws.on('close', () => {
      cleanup();
    });

    ws.on('error', () => {
      cleanup();
    });

    function forwardPanelMessage(data) {
      meta.lastActivity = Date.now();
      try {
        const parsed = JSON.parse(String(data || '{}'));
        if (parsed?.event === 'console output' && Array.isArray(parsed.args) && parsed.args[0]) {
          safeSend(ws, {
            type: 'console.output',
            line: String(parsed.args[0]),
            ts: new Date().toISOString(),
          });
        } else if (parsed?.event === 'token expiring' || parsed?.event === 'token expired') {
          invalidateWsCredCache(order.ptero_identifier);
          safeSend(ws, {
            type: 'console.system',
            message: 'Panel console token is expiring; stream may reconnect shortly.',
          });
        }
      } catch {
        // ignore malformed messages from panel
      }
    }

    function safeSend(target, payload) {
      try {
        if (target.readyState === target.OPEN) {
          target.send(JSON.stringify(payload));
        }
      } catch {
        // ignore send errors
      }
    }

    function scheduleReconnect() {
      if (meta.closed) return;
      meta.reconnectAttempts += 1;
      const attempt = meta.reconnectAttempts;
      if (attempt > 12) {
        safeSend(ws, {
          type: 'error',
          code: 'PTERO_UNAVAILABLE',
          message: 'Console backend is unavailable. Please try again later.',
        });
        return;
      }
      const baseDelay = 1000 * 2 ** Math.min(attempt - 1, 5);
      const jitter = Math.floor(Math.random() * 250);
      const delay = Math.min(45000, baseDelay + jitter);
      setTimeout(() => {
        if (meta.closed) return;
        connectPanel();
      }, delay);
    }

    function sendRateLimitedNotice() {
      const now = Date.now();
      if (now - meta.lastRateLimitNoticeAt < 30000) return;
      meta.lastRateLimitNoticeAt = now;
      safeSend(ws, {
        type: 'console.system',
        message: 'Panel rate-limited console token requests; retrying shortly.',
      });
    }

    function connectPanel() {
      if (meta.closed) return;
      if (meta.panelConnectInFlight) return;
      if (meta.panelWs && (meta.panelWs.readyState === meta.panelWs.OPEN || meta.panelWs.readyState === meta.panelWs.CONNECTING)) {
        return;
      }
      if (!PANEL_URL || !PANEL_CLIENT_KEY) {
        safeSend(ws, {
          type: 'error',
          code: 'PTERO_CONFIG_MISSING',
          message: 'Panel console is not configured.',
        });
        return;
      }
      meta.panelConnectInFlight = true;
      createPanelSocket(
        order,
        (data) => forwardPanelMessage(data),
        () => {
          meta.panelWs = null;
          if (!meta.closed) {
            scheduleReconnect();
          }
        }
      )
        .then((panelWs) => {
          meta.panelWs = panelWs;
          meta.reconnectAttempts = 0;
          meta.panelConnectInFlight = false;
          safeSend(ws, {
            type: 'console.system',
            message: 'Console connected.',
          });
        })
        .catch((err) => {
          meta.panelConnectInFlight = false;
          logger.warn(
            {
              order_id: orderId,
              user_id: userId,
              err: err?.message || String(err),
            },
            'Failed to connect to panel console websocket'
          );
          if (isPanelRateLimitedError(err)) {
            sendRateLimitedNotice();
            setTimeout(() => {
              if (!meta.closed) connectPanel();
            }, PANEL_RATE_LIMIT_COOLDOWN_MS);
            return;
          }
          scheduleReconnect();
        });
    }

    ws.on('message', (raw) => {
      meta.lastActivity = Date.now();

      const size = typeof raw === 'string' ? Buffer.byteLength(raw, 'utf8') : raw.byteLength;
      if (size > MAX_MESSAGE_BYTES) {
        safeSend(ws, {
          type: 'error',
          code: 'MESSAGE_TOO_LARGE',
          message: 'Console message is too large.',
        });
        return;
      }

      const now = Date.now();
      if (now - meta.commandWindowStart > COMMAND_WINDOW_MS) {
        meta.commandWindowStart = now;
        meta.commandCount = 0;
      }
      if (meta.commandCount >= COMMANDS_PER_WINDOW) {
        safeSend(ws, {
          type: 'error',
          code: 'RATE_LIMITED_CONSOLE_COMMANDS',
          message: 'Too many console commands. Please slow down.',
        });
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
      } catch {
        return;
      }

      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.type === 'console.command') {
        const cmd = String(parsed.command || '').trim();
        if (!cmd) return;
        meta.commandCount += 1;
        if (meta.panelWs && meta.panelWs.readyState === meta.panelWs.OPEN) {
          try {
            meta.panelWs.send(JSON.stringify({ event: 'send command', args: [cmd] }));
          } catch {
            // ignore
          }
        }
      }
    });

    // Initial connection attempt
    connectPanel();

    safeSend(ws, {
      type: 'console.system',
      message: 'Connecting to console…',
    });
  });
}


import { WebSocketServer } from 'ws';
import { URL } from 'node:url';
import pool from '../config/database.js';
import { verifyToken } from '../utils/jwt.js';
import { getLogger } from '../lib/logger.js';

const logger = getLogger();

const MAX_GLOBAL_SESSIONS = 64;
const MAX_SESSIONS_PER_USER = 4;
const MAX_SESSIONS_PER_ORDER = 2;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const COMMAND_WINDOW_MS = 2000;
const COMMANDS_PER_WINDOW = 10;
const MAX_MESSAGE_BYTES = 4096;
const PANEL_CLIENT_KEY = (process.env.PTERO_CLIENT_KEY || '').trim();
const PANEL_URL = (process.env.PANEL_URL || '').trim();

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
       o.game,
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

async function createPanelSocket(order, onMessage, onClose) {
  if (!PANEL_URL || !PANEL_CLIENT_KEY || !order.ptero_identifier) {
    throw new Error('Panel client API not configured for console streaming');
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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to obtain panel websocket token (${res.status}): ${text}`);
  }

  const body = await res.json();
  const token = body?.data?.token || body?.token;
  const socketUrl = body?.data?.socket || body?.socket;
  if (!token || !socketUrl) {
    throw new Error('Panel websocket response missing token or socket URL');
  }

  const panelWs = new WebSocket(socketUrl);

  panelWs.onopen = () => {
    panelWs.send(JSON.stringify({ event: 'auth', args: [token] }));
  };

  panelWs.onmessage = (event) => {
    onMessage(event.data);
  };

  panelWs.onclose = () => {
    onClose();
  };

  panelWs.onerror = () => {
    // Errors are surfaced via close and our retry logic.
  };

  return panelWs;
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

      const orderCount = sessionsByOrder.get(String(orderId)) || 0;
      if (orderCount >= MAX_SESSIONS_PER_ORDER) {
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

    function cleanup() {
      if (meta.closed) return;
      meta.closed = true;

      globalSessions = Math.max(0, globalSessions - 1);
      dec(sessionsByUser, userKey);
      dec(sessionsByOrder, orderId);

      clearInterval(idleTimer);

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
      if (attempt > 5) {
        safeSend(ws, {
          type: 'error',
          code: 'PTERO_UNAVAILABLE',
          message: 'Console backend is unavailable. Please try again later.',
        });
        return;
      }
      const baseDelay = 1000 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      const delay = Math.min(30000, baseDelay + jitter);
      setTimeout(() => {
        if (meta.closed) return;
        connectPanel();
      }, delay);
    }

    function connectPanel() {
      if (meta.closed) return;
      if (!PANEL_URL || !PANEL_CLIENT_KEY) {
        safeSend(ws, {
          type: 'error',
          code: 'PTERO_CONFIG_MISSING',
          message: 'Panel console is not configured.',
        });
        return;
      }
      createPanelSocket(
        order,
        (data) => forwardPanelMessage(data),
        () => {
          if (!meta.closed) {
            scheduleReconnect();
          }
        }
      )
        .then((panelWs) => {
          meta.panelWs = panelWs;
          meta.reconnectAttempts = 0;
          safeSend(ws, {
            type: 'console.system',
            message: 'Console connected.',
          });
        })
        .catch((err) => {
          logger.warn(
            {
              order_id: orderId,
              user_id: userId,
              err: err?.message || String(err),
            },
            'Failed to connect to panel console websocket'
          );
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


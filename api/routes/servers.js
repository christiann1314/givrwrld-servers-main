// Servers Route
import express from 'express';
import crypto from 'node:crypto';
import { 
  getUserServers, 
  getDecryptedSecret,
  getNodeForRegion,
  getOrCreatePterodactylUser
} from '../utils/mysql.js';
import {
  getOrder,
  canProvision,
  transitionToProvisioning,
  transitionToProvisioned,
  transitionToFailed,
  startProvisionAttempt,
  recordProvisionError,
} from '../services/OrderService.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { getLogger } from '../lib/logger.js';

const logger = getLogger();
const router = express.Router();

function hasRequiredRule(rules) {
  return String(rules || '').toLowerCase().includes('required');
}

function buildSafeToken(prefix, orderId, length = 24) {
  const raw = `${prefix}${String(orderId || '').replace(/-/g, '')}${crypto.randomBytes(8).toString('hex')}`;
  return raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, length);
}

function normalizeGameKey(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
  const aliases = {
    amongus: 'among-us',
    'among-us': 'among-us',
    among: 'among-us',
    vintagestory: 'vintage-story',
  };
  return aliases[slug] || slug;
}

function inferRequiredEnvValue(key, rules, context) {
  const upper = String(key || '').toUpperCase();
  const lowerRules = String(rules || '').toLowerCase();
  const {
    estimatedPlayers,
    gameServerPort,
    queryPort,
    rconPort,
    order,
    steamAppIdsByGame,
    rimworldUrl,
  } = context;

  const gameKey = normalizeGameKey(order.game);
  if (upper === 'APP_ID') return steamAppIdsByGame[gameKey] || '1';
  if (upper === 'AUTO_UPDATE') return '1';
  if (upper === 'MAX_PLAYERS') return String(estimatedPlayers);
  if (upper === 'SERVER_NAME' || upper === 'HOSTNAME' || upper === 'SESSION_NAME') {
    return String(order.server_name || 'GIVRwrld Server').slice(0, 80);
  }
  if (upper === 'SERVER_MAP' || upper === 'MAP') return 'TheIsland';
  if (upper === 'ARK_ADMIN_PASSWORD' || upper === 'SERVER_ADMIN_PASSWORD') {
    return buildSafeToken('Ark', order.id, 32);
  }
  if (upper === 'RCON_PASS') return buildSafeToken('Rcon', order.id, 32);
  if (upper === 'QUERY_PORT') return String(queryPort);
  if (upper === 'RCON_PORT') return String(rconPort);
  if (upper === 'APP_PORT' || upper === 'SERVER_PORT' || upper === 'PORT') return String(gameServerPort);
  if (upper === 'BATTLE_EYE') return 'true';
  if (upper === 'WORLD_SIZE') return '3000';
  if (upper === 'WORLD_NAME' || upper === 'SERVER_WORLD') return 'givrwrld';
  if (upper === 'LEVEL') return 'Procedural Map';
  if (upper === 'FRAMEWORK') {
    const plan = String(order.plan_id || '').toLowerCase();
    if (plan.includes('oxide')) return 'oxide';
    if (plan.includes('carbon')) return 'carbon';
    return 'vanilla';
  }
  if (upper === 'DOWNLOAD_URL') {
    const game = gameKey;
    if (game === 'mindustry') return 'https://github.com/Anuken/Mindustry/releases/latest/download/server-release.jar';
    if (game === 'vintage-story') return 'https://cdn.vintagestory.at/gamefiles/stable/vs_server_linux-x64_latest.tar.gz';
    if (game === 'among-us') return 'https://github.com/Impostor/Impostor/releases/latest/download/Impostor-linux-x64.zip';
    if (game === 'veloren') return 'https://download.veloren.net/latest/linux/veloren-server-cli-linux-x86_64.tar.xz';
    if (game === 'rimworld') return rimworldUrl;
  }

  if (lowerRules.includes('boolean')) return '1';
  if (lowerRules.includes('numeric') || lowerRules.includes('integer')) return '1';
  if (lowerRules.includes('url')) return 'https://example.com';
  return 'default';
}

function normalizeEnvValue(key, rawValue, rules, context) {
  const value = String(rawValue ?? '').trim();
  const lowerRules = String(rules || '').toLowerCase();

  if (lowerRules.includes('boolean')) {
    const normalized = value.toLowerCase();
    if (['1', 'true', 'on', 'yes'].includes(normalized)) return 'true';
    if (['0', 'false', 'off', 'no'].includes(normalized)) return 'false';
    return inferRequiredEnvValue(key, rules, context);
  }

  if (lowerRules.includes('alpha_dash')) {
    const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleaned.length > 0) return cleaned;
    return inferRequiredEnvValue(key, rules, context);
  }

  if (lowerRules.includes('numeric') || lowerRules.includes('integer')) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return String(Math.max(0, Math.floor(parsed)));
    return inferRequiredEnvValue(key, rules, context);
  }

  if (lowerRules.includes('url')) {
    if (/^https?:\/\//i.test(value)) return value;
    return inferRequiredEnvValue(key, rules, context);
  }

  if (hasRequiredRule(rules) && value === '') {
    return inferRequiredEnvValue(key, rules, context);
  }

  return value;
}

function isAllocationValidationError(text) {
  return String(text || '').includes('allocation.default');
}

function isRetryableDaemonError(text) {
  const raw = String(text || '').toLowerCase();
  return (
    raw.includes('daemonconnectionexception') ||
    raw.includes('"status":"504"') ||
    raw.includes('could not establish a connection to the machine') ||
    raw.includes('context canceled')
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureMetricsTables() {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS server_stats_snapshots (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id CHAR(36) NOT NULL,
      state VARCHAR(32) NOT NULL,
      cpu_percent FLOAT NULL,
      ram_percent FLOAT NULL,
      players_online INT DEFAULT 0,
      players_max INT DEFAULT 0,
      uptime_seconds BIGINT DEFAULT 0,
      sampled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_snapshots_order_time (order_id, sampled_at),
      INDEX idx_snapshots_sampled_at (sampled_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

function toPercent(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Number(num.toFixed(2))));
}

function normalizeState(status, panelState) {
  const panel = String(panelState || '').toLowerCase();
  if (panel === 'running') return 'online';
  if (panel === 'stopped' || panel === 'offline') return 'offline';
  const current = String(status || '').toLowerCase();
  if (['active', 'provisioned', 'paid'].includes(current)) return 'online';
  if (['pending', 'provisioning'].includes(current)) return 'provisioning';
  if (current === 'error') return 'error';
  return 'offline';
}

async function resolvePanelStatsForOrder(order) {
  const stats = {
    state: normalizeState(order.status),
    cpu_percent: 0,
    ram_percent: 0,
    players_online: 0,
    players_max: 0,
    uptime_seconds: 0,
  };

  const aesKey = process.env.AES_KEY;
  const panelUrl = (aesKey ? await getDecryptedSecret('panel', 'PANEL_URL', aesKey) : null) || process.env.PANEL_URL;
  const panelAppKey = (aesKey ? await getDecryptedSecret('panel', 'PANEL_APP_KEY', aesKey) : null) || process.env.PANEL_APP_KEY;
  if (!panelUrl || !panelAppKey || !order.ptero_server_id) {
    return stats;
  }

  try {
    const panelRes = await fetch(`${String(panelUrl).replace(/\/+$/, '')}/api/application/servers/${order.ptero_server_id}/resources`, {
      headers: {
        Authorization: `Bearer ${panelAppKey}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
      },
    });

    if (!panelRes.ok) {
      return stats;
    }

    const payload = await panelRes.json();
    const resources = payload?.attributes?.resources || payload?.attributes || {};
    const memoryBytes = Number(resources.memory_bytes || 0);
    const memoryLimitMb = Number(order.ram_gb || 0) * 1024;
    const memoryLimitBytes = memoryLimitMb > 0 ? memoryLimitMb * 1024 * 1024 : 0;

    stats.state = normalizeState(order.status, resources.current_state);
    stats.cpu_percent = toPercent(resources.cpu_absolute || resources.cpu_percent || 0);
    stats.ram_percent = memoryLimitBytes > 0 ? toPercent((memoryBytes / memoryLimitBytes) * 100) : 0;
    stats.uptime_seconds = Math.max(0, Math.floor(Number(resources.uptime || resources.uptime_ms || 0) / 1000));

    // Player counts are game-dependent and often unavailable from panel resources.
    // Keep cached/default values here; historical summaries still capture this signal.
    stats.players_online = Number(resources.players_online || 0) || 0;
    stats.players_max = Number(resources.players_max || 0) || 0;
  } catch {
    return stats;
  }

  return stats;
}

async function upsertLiveStats(orderId, live) {
  await pool.execute(
    `INSERT INTO server_stats_cache
      (order_id, state, cpu_percent, memory_bytes, disk_bytes, uptime_ms, players_online, players_max, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
      state = VALUES(state),
      cpu_percent = VALUES(cpu_percent),
      uptime_ms = VALUES(uptime_ms),
      players_online = VALUES(players_online),
      players_max = VALUES(players_max),
      updated_at = NOW()`,
    [
      orderId,
      live.state,
      live.cpu_percent,
      0,
      0,
      Number(live.uptime_seconds || 0) * 1000,
      live.players_online,
      live.players_max,
    ]
  );
}

async function insertSnapshot(orderId, live) {
  await pool.execute(
    `INSERT INTO server_stats_snapshots
      (order_id, state, cpu_percent, ram_percent, players_online, players_max, uptime_seconds, sampled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      orderId,
      live.state,
      live.cpu_percent,
      live.ram_percent,
      live.players_online,
      live.players_max,
      live.uptime_seconds,
    ]
  );
}

/**
 * GET /api/servers
 * Get user's servers
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const servers = await getUserServers(req.userId);
    res.json({
      success: true,
      servers
    });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({
      error: 'Failed to fetch servers',
      message: error.message
    });
  }
});

/**
 * GET /api/servers/stats?order_id=
 * Single-order server stats for dashboard (replaces Supabase server-stats when using Express).
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const orderId = req.query.order_id;
    if (!orderId) {
      return res.status(400).json({ error: 'order_id required' });
    }
    const [rows] = await pool.execute(
      `SELECT o.id, o.status, o.ptero_server_id, o.plan_id, p.ram_gb
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.id = ? AND o.user_id = ? AND o.item_type = 'game'
       LIMIT 1`,
      [orderId, req.userId]
    );
    const order = rows?.[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const live = await resolvePanelStatsForOrder(order);
    const serverIdentifier = order.ptero_server_id != null ? String(order.ptero_server_id) : String(order.id);
    res.json({
      state: live.state,
      cpu_percent: live.cpu_percent ?? 0,
      memory_bytes: live.memory_bytes ?? 0,
      disk_bytes: live.disk_bytes ?? 0,
      uptime_ms: (Number(live.uptime_seconds) || 0) * 1000,
      server_identifier: String(serverIdentifier),
      is_suspended: false,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get server stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch server stats',
      message: error?.message,
    });
  }
});

/**
 * GET /api/servers/metrics/live
 * Lightweight live service metrics for dashboard cards.
 */
router.get('/metrics/live', authenticate, async (req, res) => {
  try {
    await ensureMetricsTables();
    const [orders] = await pool.execute(
      `SELECT
         o.id,
         o.status,
         o.ptero_server_id,
         o.plan_id,
         p.ram_gb
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
         AND o.item_type = 'game'
         AND o.status IN ('paid', 'provisioning', 'provisioned', 'active')
       ORDER BY o.created_at DESC`,
      [req.userId]
    );

    const metrics = {};
    for (const order of orders) {
      const live = await resolvePanelStatsForOrder(order);
      await upsertLiveStats(order.id, live);
      await insertSnapshot(order.id, live);
      metrics[order.id] = {
        status: live.state === 'online' ? 'Online' : 'Offline',
        currentPlayers: Number(live.players_online || 0),
        maxPlayers: Number(live.players_max || 0),
        cpuPercent: toPercent(live.cpu_percent),
        ramPercent: toPercent(live.ram_percent),
        uptimeSeconds: Math.max(0, Number(live.uptime_seconds || 0)),
      };
    }

    res.json({
      success: true,
      metrics,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get live metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch live metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/servers/metrics/summary
 * 7-day historical summary sourced from DB snapshots.
 */
router.get('/metrics/summary', authenticate, async (req, res) => {
  try {
    await ensureMetricsTables();
    const days = Math.max(1, Math.min(30, Number(req.query.days || 7)));
    const [rows] = await pool.execute(
      `SELECT order_id, state, cpu_percent, players_online, uptime_seconds, sampled_at
       FROM server_stats_snapshots
       WHERE sampled_at >= (NOW() - INTERVAL ? DAY)
         AND order_id IN (
           SELECT id FROM orders
           WHERE user_id = ?
             AND item_type = 'game'
         )
       ORDER BY order_id ASC, sampled_at ASC`,
      [days, req.userId]
    );

    const grouped = new Map();
    for (const row of rows) {
      const key = row.order_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }

    const summary = {};
    for (const [orderId, snapshots] of grouped.entries()) {
      const avgCpu =
        snapshots.reduce((acc, s) => acc + Number(s.cpu_percent || 0), 0) / Math.max(1, snapshots.length);
      const peakPlayers = snapshots.reduce((peak, s) => Math.max(peak, Number(s.players_online || 0)), 0);
      const uptimePoints = snapshots.filter((s) => String(s.state || '').toLowerCase() === 'online').length;
      const uptimePercent = (uptimePoints / Math.max(1, snapshots.length)) * 100;

      let restartCount = 0;
      for (let i = 1; i < snapshots.length; i += 1) {
        const prev = String(snapshots[i - 1].state || '').toLowerCase();
        const current = String(snapshots[i].state || '').toLowerCase();
        if (prev === 'online' && current !== 'online') restartCount += 1;
      }

      summary[orderId] = {
        avgCpuPercent: toPercent(avgCpu),
        peakPlayers,
        uptimePercent: toPercent(uptimePercent),
        restartCount,
      };
    }

    res.json({
      success: true,
      days,
      summary,
    });
  } catch (error) {
    console.error('Get metrics summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics summary',
      message: error.message,
    });
  }
});

/**
 * Provision server function (can be called directly or via HTTP).
 * Idempotent: does not create a second server if ptero_server_id exists or status is provisioned.
 */
export async function provisionServer(orderId) {
  try {
    if (!orderId) {
      throw new Error('order_id is required');
    }

    const order = await getOrder(orderId, true);
    if (!order) {
      throw new Error('Order not found');
    }

    // Idempotency guard: do not provision twice
    if (!canProvision(order)) {
      return {
        success: true,
        order_id: orderId,
        server_id: order.ptero_server_id,
        server_identifier: order.ptero_identifier,
        message: 'Order already provisioned or ineligible',
      };
    }

    await transitionToProvisioning(orderId);
    await startProvisionAttempt(orderId);

    // Get Pterodactyl API credentials.
    // Use encrypted secrets when AES_KEY is available; otherwise fall back to env vars.
    const aesKey = process.env.AES_KEY;
    const panelUrl = (aesKey ? await getDecryptedSecret('panel', 'PANEL_URL', aesKey) : null) || process.env.PANEL_URL;
    const panelAppKey = (aesKey ? await getDecryptedSecret('panel', 'PANEL_APP_KEY', aesKey) : null) || process.env.PANEL_APP_KEY;

    if (!panelUrl || !panelAppKey) {
      throw new Error('Pterodactyl credentials not found. Set PANEL_URL and PANEL_APP_KEY in api/.env');
    }

    // Validate plan has egg ID
    if (!order.ptero_egg_id) {
      await recordProvisionError(orderId, 'Plan does not have ptero_egg_id configured');
      await transitionToFailed(orderId, 'Plan does not have ptero_egg_id configured');
      throw new Error('Plan does not have ptero_egg_id configured');
    }

    // Get node for region
    const node = await getNodeForRegion(order.region);
    if (!node) {
      await recordProvisionError(orderId, `No node found for region: ${order.region}`);
      await transitionToFailed(orderId, `No node found for region: ${order.region}`);
      throw new Error(`No node found for region: ${order.region}`);
    }

    // Get user details
    const [users] = await pool.execute(
      `SELECT id, email, display_name FROM users WHERE id = ?`,
      [order.user_id]
    );

    if (users.length === 0) {
      await recordProvisionError(orderId, 'User not found');
      await transitionToFailed(orderId, 'User not found');
      throw new Error('User not found');
    }

    const user = users[0];

    // Get or create Pterodactyl user
    const pteroUserId = await getOrCreatePterodactylUser(
      user.id,
      user.email,
      user.display_name || user.email.split('@')[0],
      panelUrl,
      panelAppKey
    );

    // Get egg details from MySQL
    const [eggs] = await pool.execute(
      `SELECT ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd
       FROM ptero_eggs
       WHERE ptero_egg_id = ?`,
      [order.ptero_egg_id]
    );

    if (eggs.length === 0) {
      await recordProvisionError(orderId, `Egg not found: ${order.ptero_egg_id}`);
      await transitionToFailed(orderId, `Egg not found: ${order.ptero_egg_id}`);
      throw new Error(`Egg not found: ${order.ptero_egg_id}`);
    }

    const egg = eggs[0];

    // Resolve allocation candidates:
    // 1) explicit PTERO_DEFAULT_ALLOCATION_ID (if set)
    // 2) optional CSV list in PTERO_ALLOCATION_IDS
    // 3) API-discovered free allocation IDs (if app key has access)
    const allocationCandidates = [];
    let allocationListUnauthorized = false;
    const pushCandidate = (value) => {
      const n = Number(value);
      if (n > 0 && !allocationCandidates.includes(n)) allocationCandidates.push(n);
    };
    pushCandidate(process.env.PTERO_DEFAULT_ALLOCATION_ID || 0);
    (process.env.PTERO_ALLOCATION_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(pushCandidate);

    try {
      const allocRes = await fetch(
        `${panelUrl}/api/application/nodes/${node.ptero_node_id}/allocations?per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${panelAppKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json',
          },
        }
      );
      if (allocRes.ok) {
        const allocData = await allocRes.json();
        (allocData?.data || [])
          .map((r) => r?.attributes || {})
          .filter((a) => a && (a.assigned === false || a.server === null || a.server === undefined))
          .forEach((a) => pushCandidate(a.id));
      } else if (allocRes.status === 401 || allocRes.status === 403) {
        allocationListUnauthorized = true;
      }
    } catch {
      // Best effort only. We'll rely on candidate env list if API listing is unauthorized.
    }

    if (allocationListUnauthorized) {
      const scanMin = Math.max(1, Number(process.env.PTERO_ALLOCATION_SCAN_MIN || 1));
      const scanMax = Math.max(scanMin, Number(process.env.PTERO_ALLOCATION_SCAN_MAX || 300));
      for (let id = scanMin; id <= scanMax; id += 1) {
        pushCandidate(id);
      }
    }

    if (allocationCandidates.length === 0) {
      throw new Error(
        `No allocation candidates available for node ${node.ptero_node_id}. ` +
        `Set PTERO_DEFAULT_ALLOCATION_ID or PTERO_ALLOCATION_IDS in api/.env.`
      );
    }

    // Build environment variables:
    // 1) hydrate required defaults from panel egg variables
    // 2) apply sane overrides for commonly-used keys
    const environment = {};
    const requiredVarMeta = [];
    try {
      if (egg.ptero_nest_id) {
        const eggDetailsRes = await fetch(
          `${panelUrl}/api/application/nests/${egg.ptero_nest_id}/eggs/${order.ptero_egg_id}?include=variables`,
          {
            headers: {
              'Authorization': `Bearer ${panelAppKey}`,
              'Accept': 'Application/vnd.pterodactyl.v1+json',
            },
          }
        );
        if (eggDetailsRes.ok) {
          const eggDetailsData = await eggDetailsRes.json();
          const variableRows = eggDetailsData?.attributes?.relationships?.variables?.data || [];
                  for (const row of variableRows) {
            const attr = row?.attributes || {};
            const key = String(attr?.env_variable || '').trim();
            if (!key) continue;
                    requiredVarMeta.push({
                      key,
                      rules: String(attr?.rules || ''),
                    });
            environment[key] = String(attr?.default_value ?? '');
          }
        }
      }
    } catch {
      // Fallback to static defaults below.
    }

    const gameKey = normalizeGameKey(order.game);
    const estimatedPlayersRaw = Math.max(4, Math.min(64, Number(order.ram_gb || 1) * 4));
    const estimatedPlayers = gameKey === 'palworld'
      ? Math.min(32, estimatedPlayersRaw)
      : estimatedPlayersRaw;
    const requestedPort = Number(environment.SERVER_PORT || environment.PORT || 0);
    const gameServerPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 7777;
    const queryPort = gameServerPort + 1;
    const rconPort = gameServerPort + 2;
    const arkAdminPassword =
      environment.ARK_ADMIN_PASSWORD ||
      environment.SERVER_ADMIN_PASSWORD ||
      buildSafeToken('Ark', order.id, 32);
    const steamAppIdsByGame = {
      palworld: '2394010',
      terraria: '105600',
      factorio: '427520',
      teeworlds: '380840',
      rust: '258550',
      ark: '376030',
    };
    const rimworldUrl =
      process.env.RIMWORLD_SERVER_PACKAGE_URL ||
      'https://example.com/rimworld-server.zip';

    const staticDefaults = {
      SERVER_JARFILE: 'server.jar',
      TZ: 'UTC',
      EULA: 'TRUE',
      VERSION: 'latest',
      MINECRAFT_VERSION: 'latest',
      BUILD_NUMBER: 'latest',
      DL_PATH: '',
      SERVER_NAME: order.server_name || 'GIVRwrld Server',
      HOSTNAME: order.server_name || 'GIVRwrld Server',
      SESSION_NAME: order.server_name || 'GIVRwrld Server',
      MAX_PLAYERS: String(estimatedPlayers),
      AUTO_UPDATE: '1',
      APP_ID: environment.APP_ID || steamAppIdsByGame[gameKey] || '',
      ADDITIONAL_ARGS: '',
      ADDITIONAL_FLAGS: '',
      ADDITIONAL_JAVA_FLAGS: '',
      JVM_ARGS: '',
      WORLD_NAME: 'givrwrld',
      SERVER_WORLD: 'world',
      MAP: 'TheIsland',
      SERVER_MAP: 'TheIsland',
      ARK_ADMIN_PASSWORD: arkAdminPassword,
      SERVER_ADMIN_PASSWORD: arkAdminPassword,
      QUERY_PORT: String(queryPort),
      RCON_PORT: String(rconPort),
      BATTLE_EYE: 'true',
      DOWNLOAD_URL: inferRequiredEnvValue('DOWNLOAD_URL', 'required|url', {
        estimatedPlayers,
        gameServerPort,
        queryPort,
        rconPort,
        order,
        steamAppIdsByGame,
        rimworldUrl,
      }),
      WORLD_SEED: '',
      WORLD_SIZE: '3000',
    };

    for (const [key, value] of Object.entries(staticDefaults)) {
      if (environment[key] === undefined || environment[key] === null || environment[key] === '') {
        environment[key] = value;
      }
    }

    // Game-specific required defaults to survive egg metadata fetch instability.
    if (gameKey === 'rust') {
      const rustFramework = String(order.plan_id || '').toLowerCase().includes('oxide')
        ? 'oxide'
        : String(order.plan_id || '').toLowerCase().includes('carbon')
          ? 'carbon'
          : 'vanilla';
      const rustDefaults = {
        FRAMEWORK: rustFramework,
        LEVEL: 'Procedural Map',
        DESCRIPTION: 'Powered by GIVRwrld',
        RCON_PASS: buildSafeToken('Rcon', order.id, 24),
        SAVEINTERVAL: '60',
        APP_PORT: String(gameServerPort),
        QUERY_PORT: String(queryPort),
        RCON_PORT: String(rconPort),
      };
      for (const [key, value] of Object.entries(rustDefaults)) {
        if (environment[key] === undefined || environment[key] === null || String(environment[key]).trim() === '') {
          environment[key] = value;
        }
      }
    }

    if (gameKey === 'ark') {
      const battleEye = String(environment.BATTLE_EYE || 'false').toLowerCase();
      environment.BATTLE_EYE = battleEye === 'true' ? 'true' : 'false';
      environment.SERVER_MAP = String(environment.SERVER_MAP || environment.MAP || 'TheIsland');
      environment.ARK_ADMIN_PASSWORD = String(environment.ARK_ADMIN_PASSWORD || arkAdminPassword).replace(/[^a-zA-Z0-9_-]/g, '');
      if (!environment.ARK_ADMIN_PASSWORD) {
        environment.ARK_ADMIN_PASSWORD = buildSafeToken('Ark', order.id, 32);
      }
    }

    const inferContext = {
      estimatedPlayers,
      gameServerPort,
      queryPort,
      rconPort,
      order,
      steamAppIdsByGame,
      rimworldUrl,
    };

    // Guarantee all "required" egg variables receive values so create-server validation does not fail.
    for (const { key, rules } of requiredVarMeta) {
      if (!hasRequiredRule(rules)) continue;
      if (environment[key] !== undefined && environment[key] !== null && String(environment[key]).trim() !== '') {
        continue;
      }
      environment[key] = inferRequiredEnvValue(key, rules, inferContext);
    }

    // Normalize values against egg rules to avoid validation mismatches (boolean/alpha_dash/etc).
    const normalizedKeys = new Set();
    for (const { key, rules } of requiredVarMeta) {
      if (normalizedKeys.has(key)) continue;
      normalizedKeys.add(key);
      environment[key] = normalizeEnvValue(key, environment[key], rules, inferContext);
    }
    if (gameKey === 'ark' && environment.BATTLE_EYE !== undefined) {
      const boolInput = String(environment.BATTLE_EYE).toLowerCase();
      environment.BATTLE_EYE = boolInput === 'true' || boolInput === '1' || boolInput === 'yes';
    }

    // Create server in Pterodactyl
    let lastCreateError = null;
    try {
      let serverData = null;
      const maxDaemonAttempts = Math.max(1, Number(process.env.PTERO_DAEMON_RETRY_ATTEMPTS || 4));
      for (let attempt = 1; attempt <= maxDaemonAttempts && !serverData; attempt += 1) {
        for (const allocationId of allocationCandidates) {
          const serverResponse = await fetch(`${panelUrl}/api/application/servers`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${panelAppKey}`,
              'Content-Type': 'application/json',
              'Accept': 'Application/vnd.pterodactyl.v1+json',
            },
            body: JSON.stringify({
              name: order.server_name,
              description: `GIVRwrld ${order.game} server for ${order.server_name}`,
              user: pteroUserId,
              egg: order.ptero_egg_id,
              docker_image: (egg.docker_image || 'ghcr.io/pterodactyl/yolks:java_17').replace(/\\\//g, '/'),
              startup: egg.startup_cmd || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
              environment: environment,
              limits: {
                memory: order.ram_gb * 1024,
                swap: 0,
                disk: order.ssd_gb * 1024,
                io: 500,
                cpu: order.vcores * 100,
              },
              feature_limits: {
                databases: 1,
                backups: 5,
                allocations: 1,
              },
              allocation: {
                default: allocationId,
              },
              start_on_completion: true,
              skip_scripts: false,
            }),
          });

          if (serverResponse.ok) {
            serverData = await serverResponse.json();
            break;
          }

          const errorText = await serverResponse.text();
          lastCreateError = `Failed allocation ${allocationId}: ${errorText}`;
          if (isAllocationValidationError(errorText)) {
            continue;
          }
          if (isRetryableDaemonError(errorText)) {
            break; // move to delayed next attempt cycle
          }
          // Non-allocation, non-retryable validation errors should fail fast.
          throw new Error(`Failed to create server in Pterodactyl: ${errorText}`);
        }
        if (!serverData && attempt < maxDaemonAttempts && isRetryableDaemonError(lastCreateError)) {
          await sleep(attempt * 1500);
        }
      }

      if (!serverData) {
        throw new Error(lastCreateError || 'Failed to create server in Pterodactyl: all allocations rejected');
      }
      const pteroServerId = serverData.attributes?.id;
      const pteroIdentifier = serverData.attributes?.identifier;

      await transitionToProvisioned(orderId, pteroServerId, pteroIdentifier);

      logger.info({ order_id: orderId, ptero_server_id: pteroServerId, ptero_identifier: pteroIdentifier }, 'Server provisioned');

      return {
        success: true,
        order_id: orderId,
        server_id: pteroServerId,
        server_identifier: pteroIdentifier,
        message: 'Server provisioned successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await recordProvisionError(orderId, errorMessage);
      await transitionToFailed(orderId, errorMessage);
      logger.error({ order_id: orderId, err: error, message: errorMessage }, 'Provisioning error');
      throw error;
    }
  } catch (error) {
    logger.error({ order_id: orderId, err: error }, 'Provision error');
    throw error;
  }
}

/**
 * POST /api/servers/provision
 * Provision a new server (called by webhook or manually)
 */
router.post('/provision', async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        error: 'order_id is required'
      });
    }

    const result = await provisionServer(order_id);
    res.json(result);
  } catch (error) {
    req.log?.error({ err: error, order_id: req.body?.order_id }, 'Provision API error');
    res.status(500).json({
      error: 'Failed to provision server',
      message: error.message
    });
  }
});

export default router;



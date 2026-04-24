// Servers Route
import express from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {
  getUserServers,
  getDecryptedSecret,
  getNodeForRegion,
  getOrCreatePterodactylUser,
  getActiveAddonsForOrder,
} from '../utils/mysql.js';
import {
  getOrder,
  claimOrderForProvisioning,
  transitionToProvisioned,
  transitionToFailed,
  startProvisionAttempt,
  recordProvisionError,
  backfillOrderProvisionMetadata,
  resetGameOrderToPaidAfterPanelServerRemoved,
  resetGameOrderToPaidWhenReachabilityOrphan,
  resetGameOrderToPaidWhenNoPanelServerMatch,
  syncGameOrderPanelBindingFromApplication,
} from '../services/OrderService.js';
import { schedulePostProvisionFollowup } from '../queues/postProvisionQueue.js';
import { serializeProvisionPlanForJob } from '../lib/serializeProvisionPlanForJob.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { getLogger } from '../lib/logger.js';
import { recordProvisionSuccess, recordProvisionFailure } from '../lib/metrics.js';
import {
  getServerDetails,
  getServerResources as getPterodactylResources,
  sendPowerAction,
  PterodactylError,
  PTERO_ERROR_CODES,
  mapPterodactylErrorToHttp,
} from '../services/pterodactylService.js';
import { getModProfileForOrder } from '../config/modProfiles.js';
import {
  getAllocationCountForEgg,
  rankAllocationGroups,
  applyMultiAllocationEnv,
  syncPrimaryPortEnvVars,
  buildPanelAllocationPayload,
} from '../config/gamePortPolicy.js';
import { getEggRuntimePolicy } from '../config/gameRuntimePolicy.js';
import { buildProvisionPlan } from '../lib/buildProvisionPlan.js';
import { validateProvisionPlan } from '../lib/validateProvisionPlan.js';
import { validateEggRuntimeForProvision } from '../lib/validateEggRuntime.js';
import { getImpostorLinuxDownloadUrl } from '../config/impostorReleasePolicy.js';
import {
  DASHBOARD_ACTIVE_GAME_STATUSES,
  DASHBOARD_STATUSES_REQUIRING_PANEL_SERVER,
} from '../lib/gameOrderDashboardStatuses.js';
import {
  withMysqlProvisionLock,
  buildDeterministicServerName,
  findPanelServerByExactName,
  verifyProvisionedServer,
  buildProvisionMetaFromVerification,
} from '../lib/provisionPanelHelpers.js';
import {
  upsertPublicServerSnapshot,
  getServerPublicPageSettings,
  validatePublicPageInput,
  isPublicSlugAvailable,
  upsertServerPublicPageSettings,
  isOrderEligibleForPublicPage,
} from '../lib/publicServerPages.js';
import { normalizeGameKey } from '../lib/normalizeGameKey.js';
import { preflightEggValidation, resolveDockerImage, fillCatalogDefaults } from '../lib/eggValidator.js';

const logger = getLogger();
const router = express.Router();
const isDev = process.env.NODE_ENV !== 'production';

// In-memory cache for short-lived resources responses (per order_id).
// TTL is intentionally short (2.5s) and responses are *never* used for billing.
const SERVER_RESOURCES_TTL_MS = 2500;
const serverResourcesCache = new Map();

function getCachedResources(orderId) {
  const key = String(orderId);
  const entry = serverResourcesCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    serverResourcesCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedResources(orderId, value) {
  const key = String(orderId);
  serverResourcesCache.set(key, {
    value,
    expiresAt: Date.now() + SERVER_RESOURCES_TTL_MS,
  });
}

async function persistPublicSnapshotBestEffort(orderId, payload, snapshotSource, joinAddress) {
  try {
    await upsertPublicServerSnapshot({
      orderId,
      status: payload.state,
      playersOnline: payload.players_online,
      playersMax: payload.players_max,
      joinAddress: joinAddress || null,
      snapshotSource,
      capturedAt: payload.measured_at || new Date(),
    });
  } catch (err) {
    logger.warn(
      {
        order_id: orderId,
        err: err?.message || String(err),
      },
      'Failed to persist public server snapshot'
    );
  }
}

// Simple in-memory per-order power action rate limiter.
// This is per-process and intended as a guardrail; a future iteration can
// move this to Redis for multi-instance coordination.
const POWER_RATE_WINDOW_MS = 2 * 60 * 1000;
const POWER_RATE_MAX_PER_ORDER = 10;
const powerRateState = new Map();
const slugAvailabilityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 120 : 20,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

function checkPowerRateLimit(orderId) {
  const key = String(orderId);
  const now = Date.now();
  const current = powerRateState.get(key);

  if (!current || now - current.windowStart > POWER_RATE_WINDOW_MS) {
    powerRateState.set(key, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (current.count >= POWER_RATE_MAX_PER_ORDER) {
    const retryAfterMs = Math.max(0, POWER_RATE_WINDOW_MS - (now - current.windowStart));
    return { allowed: false, retryAfterMs };
  }

  current.count += 1;
  powerRateState.set(key, current);
  return { allowed: true, retryAfterMs: 0 };
}

async function getUserGameOrderById(orderId, userId) {
  const [rows] = await pool.execute(
    `SELECT
       o.id,
       o.user_id,
       o.status,
       o.item_type,
       p.game,
       o.region,
       o.plan_id,
       o.server_name,
       o.ptero_server_id,
       o.ptero_identifier,
       o.ptero_node_id,
       p.ram_gb,
       p.vcores,
       p.ssd_gb
     FROM orders o
     LEFT JOIN plans p ON p.id = o.plan_id
     WHERE o.id = ? AND o.user_id = ? AND o.item_type = 'game'
     LIMIT 1`,
    [orderId, userId]
  );
  return rows?.[0] || null;
}

function hasRequiredRule(rules) {
  return String(rules || '').toLowerCase().includes('required');
}

function buildSafeToken(prefix, orderId, length = 24) {
  const raw = `${prefix}${String(orderId || '').replace(/-/g, '')}${crypto.randomBytes(8).toString('hex')}`;
  return raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, length);
}

// Per-game tuning for Pterodactyl `limits` block on server creation.
// A few games (ARK in particular) load worlds that peak well above their
// "advertised" RAM and get cgroup-OOM-killed with the naive memory=ram_gb*1024.
// We keep the billed RAM the SAME but add burst swap + disable the oom killer,
// and for ARK we give a small 1.5× memory headroom since Linux cgroup swap
// accounting is unreliable across kernels.
function buildPteroLimitsForGame(gameKey, { memoryMb, diskMb, cpuPercent }) {
  const base = {
    memory: memoryMb,
    swap: 0,
    disk: diskMb,
    io: 500,
    cpu: cpuPercent,
  };
  const key = String(gameKey || '').toLowerCase();
  if (key === 'ark') {
    // TheIsland fresh world loads at ~5.7 GiB RSS and hard-OOMs at a 4 GiB
    // cgroup cap. The ARK plan floor in sql/migrations/20260422120000_fix_ark_minimum_resources.sql
    // is therefore 6 GB, which should already be reflected in order.ram_gb.
    // We keep Math.max() as a belt-and-braces guard in case a grandfathered
    // 4 GB order sneaks through (e.g. resumed provisioning from a pre-migration
    // row), and we always add 2 GB swap + oom_disabled because cgroup swap
    // accounting is unreliable across kernels and ARK's peak is very spiky.
    const minArkMb = 6144;
    return {
      ...base,
      memory: Math.max(memoryMb, minArkMb),
      swap: 2048,
      oom_disabled: true,
    };
  }
  if (key === 'ark-asa') {
    const minAsaMb = 12288;
    return {
      ...base,
      memory: Math.max(memoryMb, minAsaMb),
      swap: 3072,
      oom_disabled: true,
    };
  }
  if (key === 'palworld' || key === 'rust' || key === 'enshrouded' || key === 'valheim' || key === 'counter-strike') {
    // Heavier steam-based worlds benefit from swap headroom during world gen,
    // but do not need a baseline RAM bump.
    return {
      ...base,
      swap: 1024,
      oom_disabled: true,
    };
  }
  return base;
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
  if (upper === 'SRCDS_APPID') return steamAppIdsByGame[gameKey] || '1';
  if (upper === 'AUTO_UPDATE') return '1';
  if (upper === 'MAX_PLAYERS') return String(estimatedPlayers);
  if (upper === 'SERVER_NAME' || upper === 'HOSTNAME' || upper === 'SESSION_NAME' || upper === 'SRV_NAME') {
    return String(order.server_name || 'GIVRwrld Server').slice(0, 80);
  }
  if (upper === 'WINDOWS_INSTALL') {
    if (gameKey === 'ark-asa' || gameKey === 'enshrouded') return '1';
    return '0';
  }
  if (upper === 'SERVER_MAP' || upper === 'MAP') {
    if (gameKey === 'ark-asa') return 'TheIsland_WP';
    return 'TheIsland';
  }
  if (upper === 'SRCDS_MAP' && gameKey === 'counter-strike') return 'de_dust2';
  if (upper === 'ARK_ADMIN_PASSWORD' || upper === 'SERVER_ADMIN_PASSWORD') {
    return buildSafeToken('Ark', order.id, 32);
  }
  if (upper === 'RCON_PASS') return buildSafeToken('Rcon', order.id, 32);
  // Steam Game Server Login Token (GSLT). Pterodactyl's CS:GO/Source eggs typically
  // validate STEAM_ACC as `required|alpha_num|size:32`. We send a 32-char hex
  // placeholder so the server provisions; the operator (or order metadata) can
  // replace it with a real GSLT in the Panel after first boot. Server still runs
  // for LAN/private use without a valid GSLT.
  if (upper === 'STEAM_ACC' || upper === 'STEAM_TOKEN' || upper === 'GSLT') {
    return crypto.randomBytes(16).toString('hex');
  }
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
    if (game === 'among-us') return getImpostorLinuxDownloadUrl();
    if (game === 'veloren') return 'https://download.veloren.net/latest/linux/veloren-server-cli-linux-x86_64.tar.xz';
    if (game === 'rimworld') return rimworldUrl;
  }

  if (lowerRules.includes('boolean')) return 'true';
  if (lowerRules.includes('numeric') || lowerRules.includes('integer')) return '1';
  if (lowerRules.includes('url')) return '';
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
    // Egg rules often tag Impostor PublicIp as alpha_dash; stripping breaks hostnames and IPv4.
    if (key === 'IMPOSTOR_Server__PublicIp' && value.length > 0) {
      return value;
    }
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

async function getPanelServerByExternalId(panelUrl, panelAppKey, externalId) {
  const safeExternalId = String(externalId || '').trim();
  if (!safeExternalId) return null;

  const key = String(panelAppKey || '').trim();
  if (!key) {
    throw new Error(
      'Pterodactyl Application API key is empty (PANEL_APP_KEY / secrets.panel.PANEL_APP_KEY); cannot lookup server by external_id',
    );
  }

  const res = await fetch(
    `${String(panelUrl).replace(/\/+$/, '')}/api/application/servers/external/${encodeURIComponent(safeExternalId)}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
      },
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    const hint =
      res.status === 401
        ? ' Hint: use an Application API key (ptla_…), not a Client API key (ptlc_…); ensure api/.env is loaded and PM2 was restarted with --update-env.'
        : '';
    throw new Error(`Failed to lookup panel server by external_id: ${body}${hint}`);
  }

  const data = await res.json();
  return data?.attributes || null;
}

/** Short-lived cache so one dashboard load lists Panel servers once, not per order. */
const PANEL_APP_SERVER_SNAPSHOT_TTL_MS = 5000;
let panelAppServerSnapshot = { expiresAt: 0, servers: /** @type {any[] | null} */ (null) };

function invalidatePanelApplicationServerSnapshotCache() {
  panelAppServerSnapshot = { expiresAt: 0, servers: null };
}

/** Panel Application API URL + key (trimmed). Prefer DB secrets when AES_KEY is set. */
async function resolvePanelApplicationApiCredentials() {
  const aesKey = process.env.AES_KEY;
  const panelUrl = String(
    (aesKey ? await getDecryptedSecret('panel', 'PANEL_URL', aesKey) : null) || process.env.PANEL_URL || '',
  ).trim();
  const panelAppKey = String(
    (aesKey ? await getDecryptedSecret('panel', 'PANEL_APP_KEY', aesKey) : null) ||
      process.env.PANEL_APP_KEY ||
      '',
  ).trim();
  return { panelUrl, panelAppKey };
}

async function resolvePanelApplicationCredentialsForDashboard() {
  return resolvePanelApplicationApiCredentials();
}

async function refreshPanelApplicationServerSnapshot(panelUrl, panelAppKey) {
  const base = String(panelUrl).replace(/\/+$/, '');
  const servers = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${base}/api/application/servers?page=${page}&per_page=100`, {
      headers: {
        Authorization: `Bearer ${panelAppKey}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Panel servers list HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    const json = await res.json();
    for (const row of json.data || []) {
      if (row?.attributes) servers.push(row.attributes);
    }
    const totalPages = Number(json.meta?.pagination?.total_pages);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
  }
  return servers;
}

async function getCachedPanelApplicationServers() {
  const { panelUrl, panelAppKey } = await resolvePanelApplicationCredentialsForDashboard();
  if (!panelUrl || !panelAppKey) {
    return { ok: false, servers: null };
  }
  const now = Date.now();
  if (panelAppServerSnapshot.servers && now < panelAppServerSnapshot.expiresAt) {
    return { ok: true, servers: panelAppServerSnapshot.servers };
  }
  try {
    const servers = await refreshPanelApplicationServerSnapshot(panelUrl, panelAppKey);
    panelAppServerSnapshot = { expiresAt: now + PANEL_APP_SERVER_SNAPSHOT_TTL_MS, servers };
    return { ok: true, servers };
  } catch (err) {
    logger.warn(
      { err: err?.message || String(err) },
      'panel_application_server_snapshot_failed',
    );
    return { ok: false, servers: null };
  }
}

function findPanelServerAttributesForOrder(servers, order) {
  if (!Array.isArray(servers) || !order) return null;
  const oid = String(order.id || '').trim();
  const byExternal = servers.find((a) => String(a.external_id || '').trim() === oid);
  if (byExternal) return byExternal;
  const detName = buildDeterministicServerName(order);
  const byName = servers.find((a) => String(a.name || '').trim() === detName);
  if (byName) return byName;
  if (order.ptero_server_id != null && String(order.ptero_server_id).trim() !== '') {
    const pid = Number(order.ptero_server_id);
    if (Number.isFinite(pid)) {
      return servers.find((a) => Number(a.id) === pid) || null;
    }
  }
  return null;
}

function normalizeStartupCommand(startupCmd) {
  const raw = String(startupCmd || '').trim();
  if (!raw) {
    return 'cd /home/container && ./start.sh';
  }
  // /mnt/server only exists inside the install container; at runtime the volume
  // is mounted at /home/container.  Strip every known /mnt/server pattern so the
  // startup always runs from /home/container.
  let tail = raw
    // Complex if/elif wrapper some eggs use
    .replace(
      /^\(\s*if\s*\[\s*-d\s+\/mnt\s*\];\s*then\s*mkdir\s+-p\s+\/mnt\/server;\s*cd\s+\/mnt\/server;\s*(?:elif\s*\[\s*-d\s+\/home\/container\s*\];\s*then\s*cd\s+\/home\/container;\s*)?fi\s*\)\s*&&\s*/i,
      ''
    )
    // Plain "cd /mnt/server &&" or "cd /mnt/server;" prefix
    .replace(/^cd\s+\/mnt\/server\s*(?:&&|;)\s*/i, '')
    .trim();
  if (!tail) {
    tail = './start.sh';
  }
  const lower = tail.toLowerCase();
  if (lower.startsWith('cd /home/container')) {
    return tail;
  }
  return `cd /home/container && ${tail}`;
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
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
  if (panel === 'starting') return 'starting';
  if (panel === 'stopping') return 'stopping';
  if (panel === 'stopped' || panel === 'offline') return 'offline';
  const current = String(status || '').toLowerCase();
  if (['pending', 'provisioning'].includes(current)) return 'provisioning';
  if (current === 'error' || current === 'failed') return 'error';
  if (['active', 'provisioned', 'paid', 'playable', 'configuring', 'verifying'].includes(current)) return 'unknown';
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
    /** True when Panel client API returns 404 for this identifier (server removed; DB row stale). */
    panelNotFound: false,
  };

  if (!order.ptero_identifier) {
    return stats;
  }

  try {
    const resources = await getPterodactylResources(order.ptero_identifier);
    const memoryLimitMb = Number(order.ram_gb || 0) * 1024;
    const memoryLimitBytes = memoryLimitMb > 0 ? memoryLimitMb * 1024 * 1024 : 0;

    stats.state = resources.state === 'online' ? 'online'
      : resources.state === 'offline' ? 'offline'
      : normalizeState(order.status, resources.state);
    stats.cpu_percent = toPercent(resources.cpuPercent || 0);
    stats.ram_percent = memoryLimitBytes > 0
      ? toPercent((resources.memoryBytes / memoryLimitBytes) * 100)
      : 0;
    stats.uptime_seconds = resources.uptimeSeconds ?? 0;
    stats.players_online = resources.playersOnline ?? 0;
    stats.players_max = resources.playersMax ?? 0;
  } catch (err) {
    if (err instanceof PterodactylError && err.code === PTERO_ERROR_CODES.NOT_FOUND) {
      return { ...stats, panelNotFound: true };
    }
    return stats;
  }

  return stats;
}

/**
 * When a game order still appears “active” but Panel no longer has that server (or identifiers were cleared),
 * reset the row to `paid` so it drops off the dashboard and can be re-provisioned. Returns live stats or null.
 */
async function reconcileStaleGameOrderAndResolveLive(order, userId) {
  const st = String(order.status || '').toLowerCase();
  const hasIdent = order.ptero_identifier != null && String(order.ptero_identifier).trim() !== '';
  const hasServerId = order.ptero_server_id != null && String(order.ptero_server_id).trim() !== '';

  const reachabilityOrphan =
    ['provisioned', 'configuring', 'verifying', 'playable'].includes(st) && !hasIdent && !hasServerId;

  if (reachabilityOrphan) {
    try {
      await resetGameOrderToPaidWhenReachabilityOrphan(order.id, userId);
    } catch (err) {
      logger.warn(
        { order_id: order.id, err: err?.message || String(err) },
        'order_reset_reachability_orphan_failed',
      );
    }
    return null;
  }

  const requiresPanelRow = DASHBOARD_STATUSES_REQUIRING_PANEL_SERVER.includes(st);
  if (requiresPanelRow) {
    const snap = await getCachedPanelApplicationServers();
    if (snap.ok && snap.servers) {
      const attrs = findPanelServerAttributesForOrder(snap.servers, order);
      if (!attrs) {
        try {
          await resetGameOrderToPaidWhenNoPanelServerMatch(order.id, userId);
        } catch (err) {
          logger.warn(
            { order_id: order.id, err: err?.message || String(err) },
            'order_reset_no_panel_match_failed',
          );
        }
        return null;
      }
      const sid = Number(attrs.id);
      const ident = attrs.identifier != null ? String(attrs.identifier).trim() : '';
      if (
        Number.isFinite(sid) &&
        ident &&
        (Number(order.ptero_server_id) !== sid ||
          String(order.ptero_identifier || '').trim() !== ident)
      ) {
        try {
          await syncGameOrderPanelBindingFromApplication(order.id, attrs);
        } catch (err) {
          logger.warn(
            { order_id: order.id, err: err?.message || String(err) },
            'order_panel_binding_sync_failed',
          );
        }
        order.ptero_server_id = sid;
        order.ptero_identifier = ident;
      }
    }
  }

  const live = await resolvePanelStatsForOrder(order);
  if (live.panelNotFound) {
    try {
      await resetGameOrderToPaidAfterPanelServerRemoved(order.id, userId, order.ptero_identifier);
    } catch (err) {
      logger.warn(
        { order_id: order.id, err: err?.message || String(err) },
        'order_reset_panel_404_failed',
      );
    }
    return null;
  }

  return live;
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
 * Get user's servers with live Panel stats (avoids frontend CORS to Panel).
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const servers = await getUserServers(req.userId);
    const listed = [];
    for (const server of servers) {
      const live = await reconcileStaleGameOrderAndResolveLive(server, req.userId);
      if (!live) {
        continue;
      }
      server.live = {
        state: live.state,
        cpu_percent: live.cpu_percent ?? 0,
        ram_percent: live.ram_percent ?? 0,
        uptime_seconds: live.uptime_seconds ?? 0,
        players_online: live.players_online ?? 0,
        players_max: live.players_max ?? 0,
      };
      await persistPublicSnapshotBestEffort(
        server.id,
        {
          state: server.live.state,
          players_online: server.live.players_online,
          players_max: server.live.players_max,
          measured_at: new Date().toISOString(),
        },
        'dashboard-list'
      );
      listed.push(server);
    }
    res.json({
      success: true,
      servers: listed
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
      `SELECT o.id, o.status, o.ptero_server_id, o.ptero_identifier, o.plan_id, p.ram_gb
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
    await persistPublicSnapshotBestEffort(
      order.id,
      {
        state: live.state,
        players_online: live.players_online ?? 0,
        players_max: live.players_max ?? 0,
        measured_at: new Date().toISOString(),
      },
      'dashboard-stats'
    );
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
    const st = DASHBOARD_ACTIVE_GAME_STATUSES.map(() => '?').join(', ');
    const [orders] = await pool.execute(
      `SELECT
         o.id,
         o.status,
         o.ptero_server_id,
         o.ptero_identifier,
         o.plan_id,
         p.ram_gb
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
         AND o.item_type = 'game'
         AND o.status IN (${st})
       ORDER BY o.created_at DESC`,
      [req.userId, ...DASHBOARD_ACTIVE_GAME_STATUSES]
    );

    const metrics = {};
    for (const order of orders) {
      const live = await reconcileStaleGameOrderAndResolveLive(order, req.userId);
      if (!live) {
        continue;
      }
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
      `SELECT s.order_id, s.state, s.cpu_percent, s.players_online, s.uptime_seconds, s.sampled_at
       FROM server_stats_snapshots s
       INNER JOIN orders o ON o.id = s.order_id COLLATE utf8mb4_general_ci
       WHERE s.sampled_at >= (NOW() - INTERVAL ? DAY)
         AND o.user_id = ?
         AND o.item_type = 'game'
       ORDER BY s.order_id ASC, s.sampled_at ASC`,
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
 * GET /api/servers/public-page/slug-availability?slug=&order_id=
 * Authenticated advisory check for normalized slug uniqueness.
 */
router.get('/public-page/slug-availability', authenticate, slugAvailabilityLimiter, async (req, res) => {
  try {
    const slug = String(req.query.slug || '');
    const orderId = String(req.query.order_id || '');

    if (!slug) {
      return res.status(400).json({ error: 'slug is required' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    const order = await getUserGameOrderById(orderId, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const available = await isPublicSlugAvailable(slug, order.id);
    return res.json({ available });
  } catch (error) {
    logger.error({ err: error, user_id: req.userId }, 'Failed to check public slug availability');
    return res.status(500).json({
      error: 'Failed to check slug availability',
      message: error?.message,
    });
  }
});

/**
 * GET /api/servers/:orderId/public-page
 * Authenticated server-owner view of public page settings.
 */
router.get('/:orderId/public-page', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getUserGameOrderById(orderId, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const settings = await getServerPublicPageSettings(order.id);
    const eligible = isOrderEligibleForPublicPage(order);
    return res.json({
      ...settings,
      eligible,
    });
  } catch (error) {
    logger.error({ err: error, user_id: req.userId }, 'Failed to fetch server public page settings');
    return res.status(500).json({
      error: 'Failed to fetch public page settings',
      message: error?.message,
    });
  }
});

/**
 * PUT /api/servers/:orderId/public-page
 * Authenticated server-owner update of public page settings.
 */
router.put('/:orderId/public-page', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getUserGameOrderById(orderId, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!isOrderEligibleForPublicPage(order)) {
      return res.status(400).json({ error: 'This server is not eligible for a public page.' });
    }

    const validated = validatePublicPageInput(req.body || {});
    if (Object.keys(validated.errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validated.errors,
      });
    }

    if (validated.data.public_slug) {
      const available = await isPublicSlugAvailable(validated.data.public_slug, order.id);
      if (!available) {
        return res.status(409).json({
          error: 'Slug is already in use',
          fields: { public_slug: 'That slug is already taken.' },
        });
      }
    }

    const settings = await upsertServerPublicPageSettings(order.id, validated.data);
    return res.json({
      ...settings,
      eligible: true,
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Slug is already in use',
        fields: { public_slug: 'That slug is already taken.' },
      });
    }

    logger.error({ err: error, user_id: req.userId }, 'Failed to update server public page settings');
    return res.status(500).json({
      error: 'Failed to update public page settings',
      message: error?.message,
    });
  }
});

/**
 * GET /api/servers/:orderId/resources
 * Live resources for a single order, with short TTL caching (2.5s).
 * This endpoint is informational only and must not be used for billing.
 * Registered before GET /:orderId so paths like .../resources are never captured by the param route.
 */
router.get('/:orderId/resources', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await getUserGameOrderById(orderId, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const cached = getCachedResources(order.id);
    if (cached) {
      return res.json(cached);
    }

    if (order.ptero_server_id == null || !order.ptero_identifier) {
      const measuredAt = new Date().toISOString();
      const memoryLimitBytes =
        order.ram_gb != null ? Number(order.ram_gb) * 1024 * 1024 * 1024 : null;
      const payload = {
        state: normalizeState(order.status),
        cpu_percent: 0,
        memory_bytes: 0,
        memory_limit_bytes: memoryLimitBytes,
        disk_bytes: 0,
        players_online: 0,
        players_max: 0,
        uptime_seconds: 0,
        measured_at: measuredAt,
      };
      setCachedResources(order.id, payload);
      await persistPublicSnapshotBestEffort(order.id, payload, 'provisioning');
      return res.json(payload);
    }

    try {
      const resources = await getPterodactylResources(order.ptero_identifier);
      const payload = {
        state: resources.state,
        cpu_percent: resources.cpuPercent,
        memory_bytes: resources.memoryBytes,
        memory_limit_bytes: resources.memoryLimitBytes,
        disk_bytes: resources.diskBytes,
        players_online: resources.playersOnline ?? 0,
        players_max: resources.playersMax ?? 0,
        uptime_seconds: resources.uptimeSeconds ?? 0,
        measured_at: resources.measuredAt,
      };
      setCachedResources(order.id, payload);
      await persistPublicSnapshotBestEffort(order.id, payload, 'panel-cache');
      res.json(payload);
    } catch (err) {
      if (err instanceof PterodactylError) {
        const mapped = mapPterodactylErrorToHttp(err);
        logger.warn(
          {
            order_id: order.id,
            ptero_server_id: order.ptero_server_id,
            code: mapped.body.code,
            status: mapped.status,
          },
          'Failed to fetch Pterodactyl resources for order'
        );
        return res.status(mapped.status).json(mapped.body);
      }

      logger.error(
        {
          order_id: order.id,
          ptero_server_id: order.ptero_server_id,
          err: err?.message || String(err),
        },
        'Unexpected error fetching Pterodactyl resources for order'
      );
      return res.status(502).json({
        code: 'PTERO_UNKNOWN',
        message: 'Failed to fetch server resources from panel',
      });
    }
  } catch (error) {
    logger.error({ err: error, user_id: req.userId }, 'Failed to fetch server resources for order');
    res.status(500).json({
      error: 'Failed to fetch server resources',
      message: error?.message,
    });
  }
});

/**
 * POST /api/servers/:orderId/power
 * Power controls for a single order (start/stop/restart/kill).
 * Enforces per-order rate limiting and never accepts ptero_server_id from the client.
 */
router.post('/:orderId/power', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'action is required' });
    }

    const order = await getUserGameOrderById(orderId, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.ptero_server_id == null) {
      return res.status(409).json({
        error: 'Server not provisioned yet',
        code: 'SERVER_NOT_PROVISIONED',
      });
    }
    if (order.ptero_identifier == null || String(order.ptero_identifier).trim() === '') {
      return res.status(409).json({
        error: 'Server is missing panel identifier; power actions require a linked Pterodactyl server.',
        code: 'PTERO_IDENTIFIER_MISSING',
      });
    }

    const rate = checkPowerRateLimit(order.id);
    if (!rate.allowed) {
      return res.status(429).json({
        error: 'Too many power actions for this server. Please wait before trying again.',
        code: 'RATE_LIMITED_POWER_ACTIONS',
        retry_after_seconds: Math.ceil(rate.retryAfterMs / 1000),
      });
    }

    try {
      const result = await sendPowerAction(order.ptero_identifier, action);
      return res.json({
        success: true,
        state: result.state,
      });
    } catch (err) {
      if (err instanceof PterodactylError) {
        const mapped = mapPterodactylErrorToHttp(err);
        logger.warn(
          {
            order_id: order.id,
            ptero_server_id: order.ptero_server_id,
            code: mapped.body.code,
            status: mapped.status,
          },
          'Pterodactyl power action failed for order'
        );
        return res.status(mapped.status).json(mapped.body);
      }

      logger.error(
        {
          order_id: order.id,
          ptero_server_id: order.ptero_server_id,
          err: err?.message || String(err),
        },
        'Unexpected error sending power action to Pterodactyl'
      );
      return res.status(502).json({
        code: 'PTERO_UNKNOWN',
        message: 'Failed to send power action to panel',
      });
    }
  } catch (error) {
    logger.error({ err: error, user_id: req.userId }, 'Failed to process power action for order');
    res.status(500).json({
      error: 'Failed to process power action',
      message: error?.message,
    });
  }
});

/**
 * GET /api/servers/:orderId
 * Server details for a single order, including basic Panel details when available.
 * Get active add-ons/upgrades purchased for a specific game server.
 */
router.get('/:orderId/addons', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const [rows] = await pool.execute(
      `SELECT id FROM orders WHERE id = ? AND user_id = ? AND item_type = 'game' LIMIT 1`,
      [orderId, req.userId],
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const addons = await getActiveAddonsForOrder(orderId);

    const addonMap = {};
    for (const a of addons) {
      addonMap[a.plan_id] = {
        active: true,
        addon_name: a.addon_name,
        order_id: a.id,
        purchased_at: a.created_at,
      };
    }

    res.json({ success: true, addons: addonMap, addons_list: addons });
  } catch (err) {
    logger.error({ err: err?.message, orderId: req.params.orderId }, 'Error fetching addons');
    res.status(500).json({ error: 'Failed to fetch addons' });
  }
});

/**
 * Auth invariant: user must own the order; client never provides ptero_server_id.
 * Registered after /:orderId/resources and /:orderId/power so those paths match first.
 */
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await getUserGameOrderById(orderId, req.userId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let panel = null;
    if (order.ptero_server_id != null) {
      try {
        const details = await getServerDetails(order.ptero_server_id);
        panel = details;
      } catch (err) {
        if (err instanceof PterodactylError) {
          const mapped = mapPterodactylErrorToHttp(err);
          logger.warn(
            {
              order_id: order.id,
              ptero_server_id: order.ptero_server_id,
              code: mapped.body.code,
              status: mapped.status,
            },
            'Failed to fetch Pterodactyl server details for order'
          );
        } else {
          logger.error(
            {
              order_id: order.id,
              ptero_server_id: order.ptero_server_id,
              err: err?.message || String(err),
            },
            'Unexpected error fetching Pterodactyl server details'
          );
        }
        // For PR2, treat Panel detail failures as non-fatal; return order info only.
      }
    }

    res.json({
      id: order.id,
      status: order.status,
      game: order.game,
      region: order.region,
      server_name: order.server_name,
      ptero_server_id: order.ptero_server_id ?? null,
      ptero_identifier: order.ptero_identifier ?? null,
      plan: {
        id: order.plan_id,
        ram_gb: order.ram_gb,
        vcores: order.vcores,
        ssd_gb: order.ssd_gb,
      },
      panel,
    });
  } catch (error) {
    logger.error({ err: error, user_id: req.userId }, 'Failed to fetch server details for order');
    res.status(500).json({
      error: 'Failed to fetch server details',
      message: error?.message,
    });
  }
});

/**
 * Build Panel environment for one allocation trial. Primary port comes from reserved allocations when known.
 * @param {{
 *   order: Record<string, any>,
 *   egg: Record<string, any>,
 *   eggVariableDefaults: Record<string, string>,
 *   requiredVarMeta: { key: string, rules: string }[],
 *   selectedAllocs: { id: number, port: number | null }[],
 *   pteroEggId: number,
 *   nodeFqdn?: string,
 * }} ctx
 */
function buildEnvironmentForAllocationGroup(ctx) {
  const { order, egg, eggVariableDefaults, requiredVarMeta, selectedAllocs, pteroEggId, nodeFqdn } = ctx;
  const environment = { ...eggVariableDefaults };
  const gameKey = normalizeGameKey(order.game);
  const estimatedPlayersRaw = Math.max(4, Math.min(64, Number(order.ram_gb || 1) * 4));
  const estimatedPlayers =
    gameKey === 'palworld'
      ? Math.min(32, estimatedPlayersRaw)
      : gameKey === 'counter-strike'
        ? Math.min(16, estimatedPlayersRaw)
        : estimatedPlayersRaw;

  applyMultiAllocationEnv(pteroEggId, selectedAllocs, environment);

  const knownPrimary =
    selectedAllocs[0]?.port != null && Number.isFinite(Number(selectedAllocs[0].port))
      ? Number(selectedAllocs[0].port)
      : null;
  if (knownPrimary != null && knownPrimary > 0) {
    syncPrimaryPortEnvVars(environment, knownPrimary);
  }

  const requestedPort = Number(environment.SERVER_PORT || environment.PORT || 0);
  const gameServerPort =
    knownPrimary != null && knownPrimary > 0
      ? knownPrimary
      : Number.isFinite(requestedPort) && requestedPort > 0
        ? requestedPort
        : 7777;
  const queryPort =
    selectedAllocs[1]?.port != null && Number.isFinite(Number(selectedAllocs[1].port))
      ? Number(selectedAllocs[1].port)
      : gameServerPort + 1;
  const rconPort =
    selectedAllocs[2]?.port != null && Number.isFinite(Number(selectedAllocs[2].port))
      ? Number(selectedAllocs[2].port)
      : gameServerPort + 2;

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
    'ark-asa': '2430930',
    enshrouded: '2278520',
    'counter-strike': '740',
  };
  const rimworldUrl =
    process.env.RIMWORLD_SERVER_PACKAGE_URL || 'https://example.com/rimworld-server.zip';

  const modProfile = getModProfileForOrder(order, gameKey);
  if (modProfile?.env) {
    for (const [key, value] of Object.entries(modProfile.env)) {
      if (value !== undefined && value !== null && value !== '') {
        environment[key] = String(value);
      }
    }
  }
  if (modProfile?.profileId && !environment.MOD_PROFILE_ID) {
    environment.MOD_PROFILE_ID = String(modProfile.profileId);
  }
  if (modProfile?.label && !environment.MOD_PROFILE_LABEL) {
    environment.MOD_PROFILE_LABEL = String(modProfile.label);
  }

  const defaultArkMap = gameKey === 'ark-asa' ? 'TheIsland_WP' : 'TheIsland';

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
    MAP: defaultArkMap,
    SERVER_MAP: defaultArkMap,
    ARK_ADMIN_PASSWORD: arkAdminPassword,
    SERVER_ADMIN_PASSWORD: arkAdminPassword,
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
    };
    for (const [key, value] of Object.entries(rustDefaults)) {
      if (environment[key] === undefined || environment[key] === null || String(environment[key]).trim() === '') {
        environment[key] = value;
      }
    }
    // Egg defaults often ship example.com / placeholder URLs; Steam install can misbehave if left set.
    for (const k of ['MAP_URL', 'SERVER_IMG', 'SERVER_LOGO']) {
      const v = String(environment[k] ?? '').trim().toLowerCase();
      if (v.includes('example.com')) environment[k] = '';
    }
  }

  if (gameKey === 'ark') {
    // Pterodactyl casts env values to strings, then Laravel boolean rule accepts only true/false/0/1/'0'/'1'.
    // Send '0' / '1' so it passes both string-cast and boolean validation.
    const battleEye = String(environment.BATTLE_EYE ?? '').trim().toLowerCase();
    environment.BATTLE_EYE = ['1', 'true', 'on', 'yes'].includes(battleEye) ? '1' : '0';
    environment.SERVER_MAP = String(environment.SERVER_MAP || environment.MAP || 'TheIsland');
    environment.ARK_ADMIN_PASSWORD = String(environment.ARK_ADMIN_PASSWORD || arkAdminPassword).replace(
      /[^a-zA-Z0-9_-]/g,
      '',
    );
    if (!environment.ARK_ADMIN_PASSWORD) {
      environment.ARK_ADMIN_PASSWORD = buildSafeToken('Ark', order.id, 32);
    }
    // ARK: Survival Evolved Linux dedicated server is Steam app 376030. Some Panel egg rows have
    // been observed with SRCDS_APPID=1007 (Steamworks SDK Redist), which makes SteamCMD fail with
    // 'App 1007 state is 0x2' and leaves no ShooterGame/Binaries/Linux/ShooterGameServer binary.
    // Hard-override both fields so our payload wins over egg defaults.
    environment.SRCDS_APPID = '376030';
    environment.APP_ID = '376030';
    // EXTRA_FLAGS is a free-form suffix appended after +app_update in the install script. If an
    // egg default has snuck in another app_update (e.g. '+app_update 1007 validate'), blank it
    // and reintroduce 'validate' so the intended game app is verified, not replaced.
    if (/app_update/i.test(String(environment.EXTRA_FLAGS || ''))) {
      environment.EXTRA_FLAGS = 'validate';
    } else if (!environment.EXTRA_FLAGS) {
      environment.EXTRA_FLAGS = 'validate';
    }
    // games:source entrypoint may treat STEAM_SDK as enabled when unset; always disable so
    // SteamCMD does not run +app_update 1007 (SDK redist) instead of the dedicated server.
    environment.STEAM_SDK = '0';
  }

  if (gameKey === 'ark-asa') {
    const battleEye = String(environment.BATTLE_EYE ?? '').trim().toLowerCase();
    environment.BATTLE_EYE = ['1', 'true', 'on', 'yes'].includes(battleEye) ? '1' : '0';
    const serverPve = String(environment.SERVER_PVE ?? '').trim().toLowerCase();
    environment.SERVER_PVE = ['1', 'true', 'on', 'yes'].includes(serverPve) ? '1' : '0';
    environment.SERVER_MAP = String(environment.SERVER_MAP || environment.MAP || 'TheIsland_WP');
    environment.MAP = environment.SERVER_MAP;
    environment.ARK_ADMIN_PASSWORD = String(environment.ARK_ADMIN_PASSWORD || arkAdminPassword).replace(
      /[^a-zA-Z0-9_-]/g,
      '',
    );
    if (!environment.ARK_ADMIN_PASSWORD) {
      environment.ARK_ADMIN_PASSWORD = buildSafeToken('Ark', order.id, 32);
    }
    environment.SRCDS_APPID = '2430930';
    environment.APP_ID = '2430930';
    environment.WINDOWS_INSTALL = '1';
    if (/app_update/i.test(String(environment.EXTRA_FLAGS || ''))) {
      environment.EXTRA_FLAGS = 'validate';
    } else if (!environment.EXTRA_FLAGS) {
      environment.EXTRA_FLAGS = 'validate';
    }
    environment.STEAM_SDK = '0';
  }

  // Palworld dedicated server is always Steam app 2394010. Some Panel/egg rows have been
  // seen with wrong SRCDS_APPID (e.g. 1007), which makes SteamCMD fail with 0x2 and leaves no binary.
  if (gameKey === 'palworld') {
    environment.SRCDS_APPID = '2394010';
    environment.APP_ID = '2394010';
  }

  if (gameKey === 'counter-strike') {
    environment.SRCDS_APPID = '740';
    environment.APP_ID = '740';
    if (/app_update/i.test(String(environment.EXTRA_FLAGS || ''))) {
      environment.EXTRA_FLAGS = 'validate';
    } else if (!environment.EXTRA_FLAGS) {
      environment.EXTRA_FLAGS = 'validate';
    }
    environment.STEAM_SDK = '0';
  }

  if (gameKey === 'enshrouded') {
    const enshroudedDefaults = {
      WINDOWS_INSTALL: '1',
      SRCDS_APPID: steamAppIdsByGame.enshrouded || '2278520',
      SRV_NAME: String(order.server_name || 'GIVRwrld Enshrouded Server').slice(0, 80),
    };
    for (const [key, value] of Object.entries(enshroudedDefaults)) {
      if (environment[key] === undefined || environment[key] === null || String(environment[key]).trim() === '') {
        environment[key] = value;
      }
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

  for (const { key, rules } of requiredVarMeta) {
    if (!hasRequiredRule(rules)) continue;
    if (environment[key] !== undefined && environment[key] !== null && String(environment[key]).trim() !== '') {
      continue;
    }
    environment[key] = inferRequiredEnvValue(key, rules, inferContext);
  }

  const normalizedKeys = new Set();
  for (const { key, rules } of requiredVarMeta) {
    if (normalizedKeys.has(key)) continue;
    normalizedKeys.add(key);
    environment[key] = normalizeEnvValue(key, environment[key], rules, inferContext);
  }

  // Pterodactyl casts every env value to a string before applying egg rules
  // (`VariableValidatorService` does `(string) $value`). Laravel's `boolean` rule then
  // accepts true/false/0/1/'0'/'1' but rejects 'true'/'false'. Sending JS booleans
  // round-trips to 'true'/'false' and 422s — emit '0' / '1' strings instead.
  const toBoolString = (raw, defaultTruthy = false) => {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return defaultTruthy ? '1' : '0';
    }
    if (typeof raw === 'boolean') return raw ? '1' : '0';
    const s = String(raw).trim().toLowerCase();
    return ['1', 'true', 'on', 'yes'].includes(s) ? '1' : '0';
  };

  for (const { key, rules } of requiredVarMeta) {
    if (!String(rules || '').toLowerCase().includes('boolean')) continue;
    if (environment[key] === undefined || environment[key] === null) continue;
    environment[key] = toBoolString(environment[key]);
  }

  // Required booleans for SteamCMD-based eggs that frequently 422 on create when missing.
  const knownBooleanKeys = [
    'AUTO_UPDATE',
    'WINDOWS_INSTALL',
    'VALIDATE',
    'BATTLE_EYE',
    'STEAM_SDK',
    'RCON_ENABLE',
  ];
  for (const key of knownBooleanKeys) {
    if (environment[key] === undefined || environment[key] === null) continue;
    environment[key] = toBoolString(environment[key]);
  }

  // Last-mile: if the Panel variable list was incomplete, required booleans can be missing
  // entirely (skipped above). Palworld/ARK/Enshrouded still 422 on create without them.
  const ensureBoolDefault = (key, defaultTruthy) => {
    const raw = environment[key];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      environment[key] = defaultTruthy ? '1' : '0';
    }
  };
  if (gameKey === 'palworld' || gameKey === 'ark' || gameKey === 'ark-asa' || gameKey === 'counter-strike') {
    ensureBoolDefault('AUTO_UPDATE', true);
  }
  if (gameKey === 'enshrouded' || gameKey === 'ark-asa') {
    ensureBoolDefault('WINDOWS_INSTALL', true);
  }
  if (gameKey === 'enshrouded') {
    ensureBoolDefault('AUTO_UPDATE', true);
    ensureBoolDefault('VALIDATE', false);
  }

  if (gameKey === 'among-us') {
    const fromEnv = String(
      process.env.GAME_SERVER_PUBLIC_HOST ||
        process.env.IMPOSTOR_SERVER_PUBLIC_HOST ||
        process.env.PTERO_EXTERNAL_GAME_HOST ||
        '',
    ).trim();
    const existingIp = String(environment.IMPOSTOR_Server__PublicIp || '').trim();
    const isLoopbackOrEmpty =
      !existingIp ||
      existingIp === '127.0.0.1' ||
      existingIp === '::1' ||
      /^localhost$/i.test(existingIp);
    const isUnusablePublic = (ip) =>
      !ip ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '0.0.0.0' ||
      /^localhost$/i.test(ip);

    if (fromEnv) {
      environment.IMPOSTOR_Server__PublicIp = fromEnv;
    } else if (isLoopbackOrEmpty) {
      const primaryAlloc = selectedAllocs[0];
      const fromAlias = primaryAlloc ? String(primaryAlloc.alias || '').trim() : '';
      const fromAllocIp = primaryAlloc ? String(primaryAlloc.ip || '').trim() : '';
      let resolvedIp = fromAlias || fromAllocIp;
      if (isUnusablePublic(resolvedIp)) {
        resolvedIp = '';
      }
      if (!resolvedIp && nodeFqdn) {
        resolvedIp = nodeFqdn;
      }
      if (resolvedIp) {
        environment.IMPOSTOR_Server__PublicIp = resolvedIp;
      }
    }
    const existingPublicPort = String(environment.IMPOSTOR_Server__PublicPort || '').trim();
    if (!existingPublicPort && Number.isFinite(gameServerPort) && gameServerPort > 0) {
      environment.IMPOSTOR_Server__PublicPort = String(gameServerPort);
    }
  }

  return { environment };
}

function needsProvisionMetadataBackfill(order) {
  if (!order || order.ptero_server_id == null) return false;
  const eggId = order.ptero_egg_id;
  const need =
    eggId != null && eggId !== '' && Number.isFinite(Number(eggId))
      ? getAllocationCountForEgg(Number(eggId))
      : 1;
  const uuidMissing = !order.ptero_server_uuid || String(order.ptero_server_uuid).trim() === '';
  const allocIdMissing = order.ptero_primary_allocation_id == null;
  const portMissing = order.ptero_primary_port == null;
  const idMissing = !order.ptero_identifier || String(order.ptero_identifier).trim() === '';
  const extrasMissing =
    need > 1 &&
    (order.ptero_extra_ports_json == null || String(order.ptero_extra_ports_json).trim() === '');
  return uuidMissing || allocIdMissing || portMissing || idMissing || extrasMissing;
}

/**
 * Provision server function (can be called directly or via HTTP).
 * Idempotent: does not create a second server if ptero_server_id exists or status is provisioned.
 */
export async function provisionServer(orderId) {
  const startedAt = Date.now();
  try {
    if (!orderId) {
      throw new Error('order_id is required');
    }

    const claim = await claimOrderForProvisioning(orderId);
    if (claim.action === 'not_found') {
      throw new Error('Order not found');
    }
    if (claim.action === 'ineligible') {
      throw new Error(`Order not eligible for provisioning (status: ${claim.order?.status || 'unknown'})`);
    }
    if (claim.action === 'already_done') {
      let o = claim.order;
      let backfilled = false;
      let recovered = false;

      const { panelUrl, panelAppKey } = await resolvePanelApplicationApiCredentials();

      if (panelUrl && panelAppKey) {
        if (o.ptero_server_id == null) {
          try {
            const deterministicName = buildDeterministicServerName(o);

            let existing = await getPanelServerByExternalId(panelUrl, panelAppKey, String(orderId));
            if (!existing?.id) {
              existing = await findPanelServerByExactName(
                panelUrl,
                panelAppKey,
                deterministicName,
                5,
                String(orderId),
              );
            }

            if (existing?.id) {
              const allocNeeded = o.ptero_egg_id ? getAllocationCountForEgg(o.ptero_egg_id) : 1;
              const ver = await verifyProvisionedServer(panelUrl, panelAppKey, existing.id, {
                primaryAllocationId: 0,
                additionalAllocationIds: [],
                minAllocationCount: allocNeeded,
                strictAllocationIds: false,
              });

              if (ver.ok) {
                const baseMeta = buildProvisionMetaFromVerification(ver);
                const { updated } = await backfillOrderProvisionMetadata(orderId, {
                  ...(baseMeta || {}),
                  ptero_server_id: existing.id,
                  ptero_identifier: ver.identifier || existing.identifier || undefined,
                });
                backfilled = Boolean(updated);
                recovered = true;

                const reloaded = await getOrder(orderId, true);
                if (reloaded) o = reloaded;

                logger.info(
                  {
                    event: 'provision_trace',
                    order_id: orderId,
                    step: 'already_done_recover_missing_server_id',
                    verify_ok: true,
                    recovered_server_id: existing.id,
                    backfill_updated: backfilled,
                  },
                  'provision_step',
                );
              } else {
                logger.warn(
                  {
                    event: 'provision_trace',
                    order_id: orderId,
                    step: 'already_done_recover_missing_server_id',
                    verify_ok: false,
                    candidate_server_id: existing.id,
                    error: ver.error,
                  },
                  'provision_step',
                );
              }
            } else {
              logger.warn(
                {
                  event: 'provision_trace',
                  order_id: orderId,
                  step: 'already_done_recover_missing_server_id',
                  found_candidate: false,
                },
                'provision_step',
              );
            }
          } catch (err) {
            logger.warn(
              {
                event: 'provision_trace',
                order_id: orderId,
                step: 'already_done_recover_missing_server_id',
                err: err instanceof Error ? err.message : String(err),
              },
              'provision_step',
            );
          }
        }

        if (needsProvisionMetadataBackfill(o)) {
          try {
            const allocNeeded = o.ptero_egg_id ? getAllocationCountForEgg(o.ptero_egg_id) : 1;
            const ver = await verifyProvisionedServer(panelUrl, panelAppKey, o.ptero_server_id, {
              primaryAllocationId: 0,
              additionalAllocationIds: [],
              minAllocationCount: allocNeeded,
              strictAllocationIds: false,
            });

            if (ver.ok) {
              let baseMeta = buildProvisionMetaFromVerification(ver);
              if (baseMeta) {
                const { updated } = await backfillOrderProvisionMetadata(orderId, {
                  ...baseMeta,
                  ptero_identifier: ver.identifier || undefined,
                });
                backfilled = backfilled || Boolean(updated);
              }
              logger.info(
                {
                  event: 'provision_trace',
                  order_id: orderId,
                  step: 'already_done_backfill',
                  verify_ok: true,
                  backfill_updated: backfilled,
                  had_meta: Boolean(baseMeta),
                },
                'provision_step',
              );
            } else {
              logger.warn(
                {
                  event: 'provision_trace',
                  order_id: orderId,
                  step: 'already_done_verify',
                  verify_ok: false,
                  error: ver.error,
                },
                'provision_step',
              );
            }
          } catch (err) {
            logger.warn(
              {
                event: 'provision_trace',
                order_id: orderId,
                step: 'already_done_backfill',
                err: err instanceof Error ? err.message : String(err),
              },
              'provision_step',
            );
          }
        }
      }

      const latest = backfilled || recovered ? (await getOrder(orderId, true)) || o : o;
      try {
        await schedulePostProvisionFollowup(orderId);
      } catch (schedErr) {
        logger.warn(
          {
            order_id: orderId,
            err: schedErr instanceof Error ? schedErr.message : String(schedErr),
          },
          'post_provision_schedule_skipped',
        );
      }
      return {
        success: true,
        order_id: orderId,
        server_id: latest.ptero_server_id ?? null,
        server_identifier: latest.ptero_identifier ?? null,
        message:
          recovered && backfilled
            ? 'Order already provisioned; server recovered and metadata backfilled from panel'
            : recovered
              ? 'Order already provisioned; server recovered from panel'
              : backfilled
                ? 'Order already provisioned; metadata backfilled from panel'
                : 'Order already provisioned or ineligible',
      };
    }

    const order = claim.order;
    logger.info(
      {
        event: 'provision_trace',
        order_id: orderId,
        step: 'claim',
        claimed_exclusive: claim.claimedExclusive,
        status: order.status,
        game: order.game,
        ptero_egg_id: order.ptero_egg_id,
      },
      'provision_step',
    );

    await startProvisionAttempt(orderId);

    // Capacity reservation: choose a node with available headroom and reserve RAM/disk for this order.
    const requiredRamGb = Number(order.ram_gb || 0);
    const requiredDiskGb = Number(order.ssd_gb || 0);

    if (!Number.isFinite(requiredRamGb) || !Number.isFinite(requiredDiskGb) || requiredRamGb <= 0 || requiredDiskGb <= 0) {
      await recordProvisionError(orderId, 'Invalid plan capacity (ram_gb/ssd_gb)');
      await transitionToFailed(orderId, 'Invalid plan capacity (ram_gb/ssd_gb)');
      throw new Error('Invalid plan capacity (ram_gb/ssd_gb)');
    }

    const conn = await pool.getConnection();
    let node;
    try {
      await conn.beginTransaction();

      // If capacity was already reserved for this order, reuse that node and do not double-reserve.
      const [existingCap] = await conn.execute(
        `SELECT ptero_node_id, ram_gb, disk_gb
         FROM ptero_node_capacity_ledger
         WHERE order_id = ?
         FOR UPDATE`,
        [orderId],
      );

      if (existingCap.length > 0) {
        const boundNodeId = existingCap[0].ptero_node_id;
        const [rows] = await conn.execute(
          `SELECT *
           FROM ptero_nodes
           WHERE ptero_node_id = ? AND enabled = 1
           FOR UPDATE`,
          [boundNodeId],
        );
        node = rows[0] || null;
        if (!node) {
          throw new Error(`Previously reserved node ${boundNodeId} is no longer available`);
        }
      } else {
        node = await getNodeForRegion(order.region, requiredRamGb, requiredDiskGb, conn);
        if (!node) {
          throw new Error(`No node capacity available for region: ${order.region}`);
        }

        await conn.execute(
          `INSERT INTO ptero_node_capacity_ledger (ptero_node_id, order_id, ram_gb, disk_gb)
           VALUES (?, ?, ?, ?)`,
          [node.ptero_node_id, orderId, requiredRamGb, requiredDiskGb],
        );

        // Remember which node this order is bound to.
        await conn.execute(
          `UPDATE orders
           SET ptero_node_id = COALESCE(ptero_node_id, ?)
           WHERE id = ?`,
          [node.ptero_node_id, orderId],
        );
      }

      await conn.commit();
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback error
      }
      await conn.release();

      const message = err instanceof Error ? err.message : 'Node capacity reservation failed';
      await recordProvisionError(orderId, message);
      await transitionToFailed(orderId, message);
      throw err;
    }
    await conn.release();

    // Get Pterodactyl API credentials.
    const { panelUrl, panelAppKey } = await resolvePanelApplicationApiCredentials();

    if (!panelUrl || !panelAppKey) {
      throw new Error('Pterodactyl credentials not found. Set PANEL_URL and PANEL_APP_KEY in api/.env');
    }

    try {
      const provisionResult = await withMysqlProvisionLock(orderId, async () => {
        if (!order.ptero_egg_id) {
          await recordProvisionError(orderId, 'Plan does not have ptero_egg_id configured');
          await transitionToFailed(orderId, 'Plan does not have ptero_egg_id configured');
          throw new Error('Plan does not have ptero_egg_id configured');
        }

        const allocNeeded = getAllocationCountForEgg(order.ptero_egg_id);
        const uniqueServerName = buildDeterministicServerName(order);

        let existing = await getPanelServerByExternalId(panelUrl, panelAppKey, orderId);
        if (!existing?.id) {
          existing = await findPanelServerByExactName(panelUrl, panelAppKey, uniqueServerName, 5, orderId);
        }

        if (existing?.id) {
          const verSync = await verifyProvisionedServer(panelUrl, panelAppKey, existing.id, {
            primaryAllocationId: 0,
            additionalAllocationIds: [],
            minAllocationCount: allocNeeded,
            strictAllocationIds: false,
          });
          if (!verSync.ok) {
            throw new Error(`Reconcile verify failed: ${verSync.error}`);
          }
          const metaSync = buildProvisionMetaFromVerification(verSync);
          await transitionToProvisioned(
            orderId,
            existing.id,
            verSync.identifier || existing.identifier || null,
            metaSync,
          );
          invalidatePanelApplicationServerSnapshotCache();
          try {
            await schedulePostProvisionFollowup(orderId);
          } catch (schedErr) {
            logger.warn(
              {
                order_id: orderId,
                err: schedErr instanceof Error ? schedErr.message : String(schedErr),
              },
              'post_provision_schedule_skipped',
            );
          }
          logger.info(
            {
              event: 'provision_trace',
              order_id: orderId,
              step: 'reconcile_existing',
              ptero_server_id: existing.id,
              game: order.game,
              ptero_egg_id: order.ptero_egg_id,
              verify_ok: true,
            },
            'provision_step',
          );
          return {
            success: true,
            order_id: orderId,
            server_id: existing.id,
            server_identifier: verSync.identifier || existing.identifier || null,
            message: 'Server already existed in panel; order synchronized',
          };
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
    logger.info(
      {
        event: 'provision_trace',
        order_id: orderId,
        step: 'panel_user',
        mysql_user_id: user.id,
        buyer_email: user.email,
        ptero_application_user_id: pteroUserId,
      },
      'provision_step',
    );
    const forbid = String(process.env.PTERO_FORBID_OWNER_USER_IDS || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);
    if (forbid.length && forbid.includes(Number(pteroUserId))) {
      throw new Error(
        `Refusing to create server: Panel user id ${pteroUserId} is in PTERO_FORBID_OWNER_USER_IDS. ` +
          `Fix users.pterodactyl_user_id for this customer (likely points at admin).`,
      );
    }

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
    //
    // Important safety rule:
    // If the app key cannot list allocations, we do NOT guess allocation IDs.
    // Provisioning must fail fast unless explicit safe allocation IDs are configured.
    const allocationCandidates = [];
    const freeAllocationsSorted = [];
    let allocationListUnauthorized = false;
    let allocationListFailed = false;
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

    // Walk all allocation pages. Pterodactyl's Application API only honours
    // `?include=server` for populating the `server` relationship, so we MUST
    // rely on the `assigned` flag alone — the bare `server` attribute in the
    // listing response is always null regardless of whether an allocation is
    // in use. Filtering by `server === null` admits assigned ports and makes
    // the panel reject every create-server payload with `exists` validation.
    try {
      const PER_PAGE = 100;
      const MAX_PAGES = 50; // hard cap (5,000 allocations) to bound latency
      let totalFetched = 0;
      let pageErrored = false;
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const pageRes = await fetch(
          `${panelUrl}/api/application/nodes/${node.ptero_node_id}/allocations?per_page=${PER_PAGE}&page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${panelAppKey}`,
              'Accept': 'Application/vnd.pterodactyl.v1+json',
            },
          }
        );
        if (!pageRes.ok) {
          if (pageRes.status === 401 || pageRes.status === 403) {
            allocationListUnauthorized = true;
          } else {
            allocationListFailed = true;
          }
          pageErrored = true;
          break;
        }
        const pageData = await pageRes.json();
        const rows = (pageData?.data || [])
          .map((r) => r?.attributes || {})
          // IMPORTANT: only `assigned === false` means "free". Do NOT OR with
          // `server === null` — Pterodactyl always returns server=null in this
          // listing, which would silently admit in-use allocations.
          .filter((a) => a && a.assigned === false)
          .map((a) => ({
            id: Number(a.id),
            port: Number(a.port),
            ip: a.ip != null ? String(a.ip).trim() : '',
            alias: a.alias != null ? String(a.alias).trim() : '',
          }))
          .filter((a) => a.id > 0 && Number.isFinite(a.port));
        for (const a of rows) {
          freeAllocationsSorted.push(a);
          pushCandidate(a.id);
        }
        totalFetched += (pageData?.data || []).length;
        const pagination = pageData?.meta?.pagination || {};
        const totalPages = Number(pagination.total_pages ?? 1);
        const currentPage = Number(pagination.current_page ?? page);
        if (currentPage >= totalPages) break;
      }
      freeAllocationsSorted.sort((x, y) => x.port - y.port);
      if (!pageErrored && freeAllocationsSorted.length === 0 && totalFetched === 0) {
        allocationListFailed = true;
      }
    } catch {
      allocationListFailed = true;
    }

    const hasExplicitAllocationCandidates = allocationCandidates.length > 0;
    if ((allocationListUnauthorized || allocationListFailed) && !hasExplicitAllocationCandidates) {
      const failureReason = allocationListUnauthorized
        ? `Panel app key cannot list allocations for node ${node.ptero_node_id} (received 401/403).`
        : `Panel allocation listing failed for node ${node.ptero_node_id}.`;
      throw new Error(
        `${failureReason} Configure allocation visibility for the app key or set ` +
        `PTERO_DEFAULT_ALLOCATION_ID / PTERO_ALLOCATION_IDS in api/.env.`
      );
    }

    if (allocationCandidates.length === 0) {
      throw new Error(
        `No allocation candidates available for node ${node.ptero_node_id}. ` +
        `Set PTERO_DEFAULT_ALLOCATION_ID or PTERO_ALLOCATION_IDS in api/.env.`
      );
    }

    let allocationTrialGroups;

    if (allocNeeded > 1) {
      if (allocationListUnauthorized || allocationListFailed) {
        throw new Error(
          `Egg ${order.ptero_egg_id} requires ${allocNeeded} allocations on node ${node.ptero_node_id}; ` +
          `listing allocations via the Panel API must succeed. Grant the app key node read access or fix connectivity.`
        );
      }
      if (freeAllocationsSorted.length < allocNeeded) {
        throw new Error(
          `Egg ${order.ptero_egg_id} needs ${allocNeeded} free allocations on node ${node.ptero_node_id}; ` +
          `panel reported ${freeAllocationsSorted.length} free. Add ports or free existing allocations.`
        );
      }
      allocationTrialGroups = rankAllocationGroups(freeAllocationsSorted, allocNeeded);
      if (!allocationTrialGroups.length) {
        throw new Error(`Could not build an allocation set of ${allocNeeded} for node ${node.ptero_node_id}.`);
      }
    } else {
      const idToAlloc = new Map(freeAllocationsSorted.map((a) => [a.id, a]));
      allocationTrialGroups = allocationCandidates.map((id) => {
        const meta = idToAlloc.get(id);
        return [
          meta ?? {
            id,
            port: null,
            ip: '',
            alias: '',
          },
        ];
      });
    }

    // Resolve the node's public FQDN for games that need it (e.g. Among Us Impostor).
    let nodeFqdn = '';
    try {
      const nodeRes = await fetch(
        `${panelUrl}/api/application/nodes/${node.ptero_node_id}`,
        { headers: { 'Authorization': `Bearer ${panelAppKey}`, 'Accept': 'Application/vnd.pterodactyl.v1+json' } },
      );
      if (nodeRes.ok) {
        const nd = await nodeRes.json();
        nodeFqdn = String(nd?.attributes?.fqdn || '').trim();
      }
    } catch {
      // Non-fatal; fallback handled downstream.
    }

    // Build environment variable defaults from Panel egg metadata (per-allocation fill happens at create time).
    // 1) hydrate required defaults from panel egg variables
    // 2) apply sane overrides for commonly-used keys
    const eggVariableDefaults = {};
    const requiredVarMeta = [];
    /** Prefer Panel egg startup/docker over app DB — MySQL catalog rows can be wrong (e.g. cloned egg IDs). */
    let panelEggStartup = null;
    let panelEggDockerImage = null;
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
          const attrs = eggDetailsData?.attributes || {};
          const su = attrs.startup != null ? String(attrs.startup).trim() : '';
          if (su) panelEggStartup = su;
          const rawDi = attrs.docker_image;
          if (typeof rawDi === 'string' && rawDi.trim()) {
            panelEggDockerImage = rawDi.replace(/\\\//g, '/');
          }
          const variableRows = attrs.relationships?.variables?.data || [];
          for (const row of variableRows) {
            const attr = row?.attributes || {};
            const key = String(attr?.env_variable || '').trim();
            if (!key) continue;
            requiredVarMeta.push({
              key,
              rules: String(attr?.rules || ''),
            });
            eggVariableDefaults[key] = String(attr?.default_value ?? '');
          }
        }
      }
    } catch (eggFetchErr) {
      logger.warn(
        { order_id: orderId, egg_id: order.ptero_egg_id, nest_id: egg.ptero_nest_id, err: eggFetchErr },
        'panel_egg_variable_fetch_failed',
      );
    }

    const startupForNormalize =
      (panelEggStartup && String(panelEggStartup).trim()) ||
      (egg.startup_cmd && String(egg.startup_cmd).trim()) ||
      '';
    const resolvedStartupCmd = normalizeStartupCommand(startupForNormalize);

    let resolvedDockerImage =
      (panelEggDockerImage && String(panelEggDockerImage).trim()) ||
      (egg.docker_image && String(egg.docker_image).trim()) ||
      '';
    if (!resolvedDockerImage) {
      resolvedDockerImage = 'ghcr.io/pterodactyl/yolks:debian';
    }

    const runtimePolicy = getEggRuntimePolicy(order.ptero_egg_id);

    if (runtimePolicy?.preferredDockerImage) {
      const preferred = runtimePolicy.preferredDockerImage;
      const javaMatch = resolvedDockerImage.match(/java_(\d+)/);
      const preferredMatch = preferred.match(/java_(\d+)/);
      if (javaMatch && preferredMatch && Number(javaMatch[1]) < Number(preferredMatch[1])) {
        logger.info({
          event: 'provision_trace',
          order_id: orderId,
          step: 'docker_image_upgrade',
          from: resolvedDockerImage,
          to: preferred,
        }, 'provision_step');
        resolvedDockerImage = preferred;
      }
    }
    // ── Catalog pre-flight first: lets us override the Docker image to the catalog
    //    defaultImage (verified working) BEFORE we compare it to the runtime policy. ──
    const preflight = preflightEggValidation({
      eggId: order.ptero_egg_id,
      panelDockerImage: resolvedDockerImage,
      panelStartup: resolvedStartupCmd,
      panelEnvVars: eggVariableDefaults,
    });
    if (preflight.catalogEntry) {
      resolvedDockerImage = resolveDockerImage(order.ptero_egg_id, resolvedDockerImage);
      fillCatalogDefaults(order.ptero_egg_id, eggVariableDefaults);
      logger.info(
        {
          event: 'provision_trace',
          order_id: orderId,
          step: 'egg_catalog_preflight',
          egg_id: order.ptero_egg_id,
          game: preflight.catalogEntry.gameKey,
          variant: preflight.catalogEntry.variant,
          resolved_image: resolvedDockerImage,
          warnings: preflight.warnings,
          errors: preflight.errors,
        },
        'provision_step',
      );
    }

    if (runtimePolicy?.requiredDockerImage) {
      if (!egg.ptero_nest_id) {
        await recordProvisionError(orderId, `Egg ${order.ptero_egg_id} missing ptero_nest_id; cannot validate docker image`);
        await transitionToFailed(orderId, 'Egg catalog incomplete (nest id)');
        throw new Error(`Egg ${order.ptero_egg_id} missing ptero_nest_id in catalog`);
      }
      try {
        await validateEggRuntimeForProvision({
          panelUrl,
          panelAppKey,
          nestId: Number(egg.ptero_nest_id),
          eggId: Number(order.ptero_egg_id),
          resolvedDockerImage,
          requiredDockerImage: runtimePolicy.requiredDockerImage,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordProvisionError(orderId, msg);
        await transitionToFailed(orderId, msg);
        throw err;
      }
    }
    if (!preflight.ok) {
      const msg = `Egg catalog validation failed: ${preflight.errors.join('; ')}`;
      await recordProvisionError(orderId, msg);
      await transitionToFailed(orderId, msg);
      throw new Error(msg);
    }

    const firstTrialGroup = allocationTrialGroups[0];
    if (firstTrialGroup && firstTrialGroup.length > 0) {
      const provisionPlanPreview = buildProvisionPlan({
        order,
        gameKey: normalizeGameKey(order.game),
        allocations: firstTrialGroup,
      });
      try {
        validateProvisionPlan(provisionPlanPreview);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordProvisionError(orderId, msg);
        await transitionToFailed(orderId, msg);
        throw err;
      }
      if (provisionPlanPreview.httpsProxyRegistration) {
        logger.info(
          {
            event: 'provision_plan_https',
            order_id: orderId,
            hostname: provisionPlanPreview.httpsProxyRegistration.hostname,
            upstream_port: provisionPlanPreview.httpsProxyRegistration.upstreamPort,
          },
          'Class C game: ensure DNS + TLS + nginx on node (metadata only from API)',
        );
      }
    }

        // Create server in Pterodactyl
        let lastCreateError = null;
        let serverData = null;
        const maxDaemonAttempts = Math.max(1, Number(process.env.PTERO_DAEMON_RETRY_ATTEMPTS || 4));

        let winningAllocationGroup = null;

      for (let attempt = 1; attempt <= maxDaemonAttempts && !serverData; attempt += 1) {
        for (const allocationGroup of allocationTrialGroups) {
          const primary = allocationGroup[0];
          if (!primary?.id) continue;

          const { environment } = buildEnvironmentForAllocationGroup({
            order,
            egg,
            eggVariableDefaults,
            requiredVarMeta,
            selectedAllocs: allocationGroup,
            pteroEggId: order.ptero_egg_id,
            nodeFqdn,
          });

          const startupCmd = resolvedStartupCmd;
          const allocationPayload = buildPanelAllocationPayload(allocationGroup, allocNeeded);

          // Final-mile sanitizer. Pterodactyl's `VariableValidatorService` runs Laravel's
          // `boolean` rule directly on the JSON value for each egg variable. That rule
          // accepts true, false, 0, 1, '0', '1'. Some Panel builds only accept native
          // JSON booleans (true/false), so we emit those to be universally safe.
          const booleanKeyRules = new Map();
          for (const { key, rules } of requiredVarMeta) {
            if (String(rules || '').toLowerCase().includes('boolean')) {
              booleanKeyRules.set(key, rules);
            }
          }
          for (const k of ['AUTO_UPDATE', 'WINDOWS_INSTALL', 'VALIDATE', 'BATTLE_EYE', 'STEAM_SDK', 'SRCDS_VALIDATE']) {
            if (environment[k] !== undefined && !booleanKeyRules.has(k)) {
              booleanKeyRules.set(k, 'boolean');
            }
          }
          const payloadEnvironment = { ...environment };
          for (const k of booleanKeyRules.keys()) {
            const raw = payloadEnvironment[k];
            if (raw === undefined || raw === null) continue;
            const s = typeof raw === 'boolean' ? (raw ? '1' : '0') : String(raw).trim().toLowerCase();
            payloadEnvironment[k] = ['1', 'true', 'on', 'yes'].includes(s);
          }

          if (payloadEnvironment.RCON_ENABLE !== undefined && payloadEnvironment.RCON_ENABLE !== null) {
            const rawR = payloadEnvironment.RCON_ENABLE;
            const on =
              rawR === true ||
              rawR === 1 ||
              ["1", "true", "on", "yes"].includes(String(rawR).trim().toLowerCase());
            payloadEnvironment.RCON_ENABLE = on ? "True" : "False";
          }

          const boolDebug = {};
          for (const k of booleanKeyRules.keys()) {
            boolDebug[k] = { value: payloadEnvironment[k], type: typeof payloadEnvironment[k] };
          }

          logger.info(
            {
              event: 'provision_trace',
              order_id: orderId,
              step: 'panel_create_allocation_payload',
              egg_id: order.ptero_egg_id,
              alloc_needed: allocNeeded,
              default_allocation_id: allocationPayload.default,
              additional_allocation_ids: allocationPayload.additional ?? [],
              bool_env: boolDebug,
            },
            'provision_step',
          );

          const serverResponse = await fetch(`${panelUrl}/api/application/servers`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${panelAppKey}`,
              'Content-Type': 'application/json',
              'Accept': 'Application/vnd.pterodactyl.v1+json',
            },
            body: JSON.stringify({
              name: uniqueServerName,
              description: `GIVRwrld ${order.game} server for ${uniqueServerName}`,
              external_id: String(orderId),
              user: pteroUserId,
              egg: order.ptero_egg_id,
              docker_image: resolvedDockerImage,
              startup: startupCmd,
              environment: payloadEnvironment,
              limits: buildPteroLimitsForGame(normalizeGameKey(order.game), {
                memoryMb: order.ram_gb * 1024,
                diskMb: order.ssd_gb * 1024,
                cpuPercent: order.vcores * 100,
              }),
              feature_limits: {
                databases: 1,
                backups: 5,
                allocations: allocNeeded,
              },
              allocation: allocationPayload,
              start_on_completion: true,
              skip_scripts: false,
            }),
          });

          if (serverResponse.ok) {
            serverData = await serverResponse.json();
            winningAllocationGroup = allocationGroup;
            break;
          }

          const errorText = await serverResponse.text();
          const allocLabel = allocationGroup.map((a) => a.id).join('+');
          lastCreateError = `Failed allocations [${allocLabel}]: ${errorText}`;
          logger.error(
            {
              event: 'ptero_create_server_rejected',
              order_id: orderId,
              node_id: node.ptero_node_id,
              egg_id: order.ptero_egg_id,
              game: order.game,
              alloc_needed: allocNeeded,
              allocation_payload: allocationPayload,
              http_status: serverResponse.status,
              error_text:
                errorText.length > 12_000 ? `${errorText.slice(0, 12_000)}…(truncated)` : errorText,
            },
            'Pterodactyl create server rejected',
          );
          if (isAllocationValidationError(errorText)) {
            continue;
          }
          if (isRetryableDaemonError(errorText)) {
            break;
          }
          if (String(errorText).toLowerCase().includes('external_id')) {
            const existingByExternalId = await getPanelServerByExternalId(panelUrl, panelAppKey, orderId);
            if (existingByExternalId?.id) {
              serverData = { attributes: existingByExternalId };
              break;
            }
          }
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

        let verifyExpected;
        if (winningAllocationGroup?.length) {
          verifyExpected = {
            primaryAllocationId: winningAllocationGroup[0].id,
            additionalAllocationIds: winningAllocationGroup.slice(1).map((a) => a.id),
            minAllocationCount: allocNeeded,
            strictAllocationIds: true,
          };
        } else {
          verifyExpected = {
            primaryAllocationId: 0,
            additionalAllocationIds: [],
            minAllocationCount: allocNeeded,
            strictAllocationIds: false,
          };
        }

        const verCreate = await verifyProvisionedServer(panelUrl, panelAppKey, pteroServerId, verifyExpected);
        if (!verCreate.ok) {
          throw new Error(`Post-create verification failed: ${verCreate.error}`);
        }
        const provisionMeta = buildProvisionMetaFromVerification(verCreate);
        await transitionToProvisioned(
          orderId,
          pteroServerId,
          verCreate.identifier || pteroIdentifier,
          provisionMeta,
        );
        invalidatePanelApplicationServerSnapshotCache();

        const provisionPlanForQueue =
          winningAllocationGroup?.length > 0
            ? serializeProvisionPlanForJob(
                buildProvisionPlan({
                  order,
                  gameKey: normalizeGameKey(order.game),
                  allocations: winningAllocationGroup,
                }),
              )
            : null;

        try {
          await schedulePostProvisionFollowup(orderId, {
            serverId: pteroServerId,
            provisionPlan: provisionPlanForQueue,
          });
        } catch (schedErr) {
          logger.warn(
            {
              order_id: orderId,
              err: schedErr instanceof Error ? schedErr.message : String(schedErr),
            },
            'post_provision_schedule_skipped',
          );
        }

        logger.info(
          {
            event: 'provision_trace',
            order_id: orderId,
            step: 'create_verified',
            ptero_server_id: pteroServerId,
            game: order.game,
            ptero_egg_id: order.ptero_egg_id,
            allocation_ids: winningAllocationGroup?.map((a) => a.id) ?? null,
            ports: winningAllocationGroup?.map((a) => a.port) ?? null,
            verify_ok: true,
            create_summary: {
              egg: order.ptero_egg_id,
              feature_allocations: allocNeeded,
              server_name: uniqueServerName,
            },
          },
          'provision_step',
        );

        return {
          success: true,
          order_id: orderId,
          server_id: pteroServerId,
          server_identifier: verCreate.identifier || pteroIdentifier,
          message: 'Server provisioned successfully',
        };
      });

      const durationMs = Date.now() - startedAt;
      recordProvisionSuccess(durationMs);
      logger.info(
        {
          order_id: orderId,
          ...provisionResult,
          provisioning_duration_ms: durationMs,
        },
        'Server provisioned',
      );

      return provisionResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await recordProvisionError(orderId, errorMessage);
      await transitionToFailed(orderId, errorMessage);
      logger.error({ order_id: orderId, err: error, message: errorMessage }, 'Provisioning error');
      throw error;
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    recordProvisionFailure(durationMs);
    logger.error({ order_id: orderId, err: error, provisioning_duration_ms: durationMs }, 'Provision error');
    throw error;
  }
}

/**
 * POST /api/servers/provision
 * Provision a new server (called by webhook or manually).
 */
router.post('/provision', authenticate, async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        error: 'order_id is required',
      });
    }

    const result = await provisionServer(order_id);
    res.json(result);
  } catch (error) {
    req.log?.error({ err: error, order_id: req.body?.order_id }, 'Provision API error');
    res.status(500).json({
      error: 'Failed to provision server',
      message: error.message,
    });
  }
});

export default router;



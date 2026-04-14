import pool from '../config/database.js';
import { ORDER_STATUS } from '../services/OrderService.js';

const PUBLIC_SNAPSHOT_SOFT_STALE_MS = 5 * 60 * 1000;
const PUBLIC_SNAPSHOT_HARD_STALE_MS = 15 * 60 * 1000;
const truthy = new Set(['1', 'true', 'yes', 'on']);
const PUBLIC_KICK_EMBED_ENABLED = truthy.has(
  String(process.env.PUBLIC_KICK_EMBED_ENABLED || process.env.VITE_PUBLIC_KICK_EMBED_ENABLED || '')
    .toLowerCase()
    .trim()
);

/** Game orders that may configure a public streamer page (includes fully live servers). */
const ELIGIBLE_ORDER_STATUSES = new Set([
  ORDER_STATUS.PAID,
  ORDER_STATUS.PROVISIONING,
  ORDER_STATUS.PROVISIONED,
  ORDER_STATUS.CONFIGURING,
  ORDER_STATUS.VERIFYING,
  ORDER_STATUS.PLAYABLE,
  'active',
]);
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'billing',
  'dashboard',
  'deploy',
  'discord',
  'faq',
  'home',
  'login',
  'privacy',
  'server',
  'servers',
  'settings',
  'signup',
  'status',
  'support',
  'terms',
]);

export function normalizePublicSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isOrderEligibleForPublicPage(order) {
  const status = String(order?.order_status ?? order?.status ?? '')
    .toLowerCase()
    .trim();
  const itemType = String(order?.item_type || '')
    .toLowerCase()
    .trim();

  if (itemType && itemType !== 'game') return false;
  return ELIGIBLE_ORDER_STATUSES.has(status);
}

function normalizeStreamPlatform(value) {
  const platform = String(value || '')
    .toLowerCase()
    .trim();
  return platform === 'twitch' || platform === 'kick' ? platform : null;
}

function normalizeOptionalText(value, maxLength) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function validateHostedUrl(value, allowedHosts, label) {
  const text = normalizeOptionalText(value, 255);
  if (!text) return { value: null, error: null };

  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return { value: null, error: `${label} must be a valid URL.` };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { value: null, error: `${label} must use http or https.` };
  }

  const host = parsed.hostname.toLowerCase();
  if (!allowedHosts.includes(host)) {
    return { value: null, error: `${label} must use an approved host.` };
  }

  return { value: parsed.toString(), error: null };
}

function validateChannel(value, platform) {
  const text = normalizeOptionalText(value, 120);
  if (!text) return { value: null, error: null };

  const pattern = platform === 'kick'
    ? /^[a-zA-Z0-9._-]{2,120}$/
    : /^[a-zA-Z0-9_]{2,120}$/;

  if (!pattern.test(text)) {
    return {
      value: null,
      error: platform === 'kick'
        ? 'Kick channel may only contain letters, numbers, dot, underscore, and hyphen.'
        : 'Twitch channel may only contain letters, numbers, and underscore.',
    };
  }

  return { value: text, error: null };
}

export function validatePublicPageInput(input, { requireSlug = false } = {}) {
  const errors = {};
  const publicPageEnabled = Number(input?.public_page_enabled ? 1 : 0);
  const slug = normalizePublicSlug(input?.public_slug);
  const streamerName = normalizeOptionalText(input?.streamer_name, 120);
  const serverDescription = normalizeOptionalText(input?.server_description, 1000);
  const platform = normalizeStreamPlatform(input?.stream_platform);
  const kickEmbedEnabled = Number(input?.kick_embed_enabled ? 1 : 0);

  if (publicPageEnabled || requireSlug) {
    if (!slug) {
      errors.public_slug = 'Slug is required when the public page is enabled.';
    } else {
      if (slug.length < 3) errors.public_slug = 'Slug must be at least 3 characters.';
      if (slug.includes('--')) errors.public_slug = 'Slug cannot contain repeated hyphens.';
      if (RESERVED_SLUGS.has(slug)) errors.public_slug = 'This slug is reserved.';
    }
  }

  if (input?.stream_platform != null && input?.stream_platform !== '' && !platform) {
    errors.stream_platform = 'Stream platform must be twitch or kick.';
  }

  const channelResult = validateChannel(input?.stream_channel, platform || 'twitch');
  if (channelResult.error) errors.stream_channel = channelResult.error;

  const streamUrlResult = validateHostedUrl(
    input?.stream_url,
    platform === 'kick'
      ? ['kick.com', 'www.kick.com']
      : ['twitch.tv', 'www.twitch.tv'],
    'Stream URL'
  );
  if (input?.stream_url && !platform) {
    errors.stream_platform = 'Choose a stream platform before setting a stream URL.';
  } else if (streamUrlResult.error) {
    errors.stream_url = streamUrlResult.error;
  }

  const discordUrlResult = validateHostedUrl(
    input?.discord_url,
    ['discord.gg', 'discord.com', 'www.discord.com'],
    'Discord URL'
  );
  if (discordUrlResult.error) errors.discord_url = discordUrlResult.error;

  return {
    errors,
    data: {
      public_page_enabled: publicPageEnabled,
      public_slug: slug || null,
      streamer_name: streamerName,
      stream_platform: platform,
      stream_channel: channelResult.value,
      stream_url: streamUrlResult.value,
      discord_url: discordUrlResult.value,
      server_description: serverDescription,
      kick_embed_enabled: kickEmbedEnabled,
    },
  };
}

export async function isPublicSlugAvailable(rawSlug, excludeOrderId = null) {
  const slug = normalizePublicSlug(rawSlug);
  if (!slug || RESERVED_SLUGS.has(slug)) return false;
  const [rows] = await pool.execute(
    `SELECT 1
       FROM server_public_pages
      WHERE public_slug = ?
        AND (? IS NULL OR order_id <> ?)
      LIMIT 1`,
    [slug, excludeOrderId, excludeOrderId]
  );
  return rows.length === 0;
}

export async function getServerPublicPageSettings(orderId) {
  const [rows] = await pool.execute(
    `SELECT
       order_id,
       public_page_enabled,
       public_slug,
       streamer_name,
       stream_platform,
       stream_channel,
       stream_url,
       discord_url,
       server_description,
       kick_embed_enabled
     FROM server_public_pages
     WHERE order_id = ?
     LIMIT 1`,
    [String(orderId)]
  );

  const row = rows?.[0];
  if (!row) {
    return {
      order_id: String(orderId),
      public_page_enabled: 0,
      public_slug: null,
      streamer_name: null,
      stream_platform: null,
      stream_channel: null,
      stream_url: null,
      discord_url: null,
      server_description: null,
      kick_embed_enabled: 0,
    };
  }

  return {
    order_id: String(row.order_id),
    public_page_enabled: Number(row.public_page_enabled || 0),
    public_slug: row.public_slug || null,
    streamer_name: row.streamer_name || null,
    stream_platform: row.stream_platform || null,
    stream_channel: row.stream_channel || null,
    stream_url: row.stream_url || null,
    discord_url: row.discord_url || null,
    server_description: row.server_description || null,
    kick_embed_enabled: Number(row.kick_embed_enabled || 0),
  };
}

export async function upsertServerPublicPageSettings(orderId, validatedData) {
  await pool.execute(
    `INSERT INTO server_public_pages
      (order_id, public_page_enabled, public_slug, streamer_name, stream_platform, stream_channel, stream_url, discord_url, server_description, kick_embed_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      public_page_enabled = VALUES(public_page_enabled),
      public_slug = VALUES(public_slug),
      streamer_name = VALUES(streamer_name),
      stream_platform = VALUES(stream_platform),
      stream_channel = VALUES(stream_channel),
      stream_url = VALUES(stream_url),
      discord_url = VALUES(discord_url),
      server_description = VALUES(server_description),
      kick_embed_enabled = VALUES(kick_embed_enabled),
      updated_at = CURRENT_TIMESTAMP`,
    [
      String(orderId),
      validatedData.public_page_enabled,
      validatedData.public_slug,
      validatedData.streamer_name,
      validatedData.stream_platform,
      validatedData.stream_channel,
      validatedData.stream_url,
      validatedData.discord_url,
      validatedData.server_description,
      validatedData.kick_embed_enabled,
    ]
  );

  return getServerPublicPageSettings(orderId);
}

export async function disablePublicPageForOrder(orderId) {
  await pool.execute(
    `UPDATE server_public_pages
        SET public_page_enabled = 0,
            updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?`,
    [String(orderId)]
  );
}

export function normalizePublicSnapshotState(snapshotStatus, orderStatus) {
  const snapshot = String(snapshotStatus || '')
    .toLowerCase()
    .trim();
  if (['online', 'offline', 'provisioning', 'error', 'unknown'].includes(snapshot)) {
    return snapshot;
  }

  const order = String(orderStatus || '')
    .toLowerCase()
    .trim();
  if (order === ORDER_STATUS.PROVISIONING) return 'provisioning';
  return 'unknown';
}

function toSafeNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function sanitizeJoinAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw.slice(0, 255);
}

function buildStreamPayload(row) {
  const platform = normalizeStreamPlatform(row.stream_platform);
  if (!platform) return null;

  const channel = String(row.stream_channel || '').trim() || null;
  const explicitUrl = String(row.stream_url || '').trim() || null;
  const url =
    explicitUrl ||
    (platform === 'twitch' && channel ? `https://www.twitch.tv/${channel}` : null) ||
    (platform === 'kick' && channel ? `https://kick.com/${channel}` : null);

  return {
    platform,
    channel,
    url,
    embed_enabled: platform === 'twitch' ? true : PUBLIC_KICK_EMBED_ENABLED && Number(row.kick_embed_enabled || 0) === 1,
  };
}

function buildPublicSnapshot(row) {
  const capturedAt = row.snapshot_captured_at ? new Date(row.snapshot_captured_at) : null;
  const capturedAtIso =
    capturedAt && Number.isFinite(capturedAt.getTime()) ? capturedAt.toISOString() : null;
  const ageMs = capturedAtIso ? Date.now() - capturedAt.getTime() : null;
  const isStale = ageMs != null && ageMs > PUBLIC_SNAPSHOT_SOFT_STALE_MS;
  const isExpired = ageMs == null || ageMs > PUBLIC_SNAPSHOT_HARD_STALE_MS;

  if (isExpired) {
    return {
      status: normalizePublicSnapshotState(null, row.order_status),
      players_online: 0,
      players_max: 0,
      join: null,
      snapshot_captured_at: capturedAtIso,
      is_stale: Boolean(capturedAtIso),
    };
  }

  return {
    status: normalizePublicSnapshotState(row.snapshot_status, row.order_status),
    players_online: toSafeNonNegativeInt(row.players_online),
    players_max: toSafeNonNegativeInt(row.players_max),
    join: (() => {
      const address = sanitizeJoinAddress(row.join_address);
      if (!address) return null;
      return {
        address,
        copy_text: address,
      };
    })(),
    snapshot_captured_at: capturedAtIso,
    is_stale: isStale,
  };
}

export async function upsertPublicServerSnapshot({
  orderId,
  status,
  playersOnline = 0,
  playersMax = 0,
  joinAddress = null,
  snapshotSource = 'panel-cache',
  capturedAt = new Date(),
}) {
  await pool.execute(
    `INSERT INTO server_public_snapshots
      (order_id, status, players_online, players_max, join_address, snapshot_source, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      players_online = VALUES(players_online),
      players_max = VALUES(players_max),
      join_address = VALUES(join_address),
      snapshot_source = VALUES(snapshot_source),
      captured_at = VALUES(captured_at),
      updated_at = CURRENT_TIMESTAMP`,
    [
      String(orderId),
      normalizePublicSnapshotState(status, null),
      toSafeNonNegativeInt(playersOnline),
      toSafeNonNegativeInt(playersMax),
      sanitizeJoinAddress(joinAddress),
      String(snapshotSource || 'panel-cache').slice(0, 32),
      capturedAt instanceof Date ? capturedAt : new Date(capturedAt),
    ]
  );
}

export async function getPublicServerPageBySlug(rawSlug) {
  const slug = normalizePublicSlug(rawSlug);
  if (!slug) {
    return { reason: 'invalid_slug', page: null, slug: null, orderId: null };
  }

  const [rows] = await pool.execute(
    `SELECT
       spp.order_id,
       spp.public_slug,
       spp.streamer_name,
       spp.stream_platform,
       spp.stream_channel,
       spp.stream_url,
       spp.discord_url,
       spp.server_description,
       spp.kick_embed_enabled,
       o.status AS order_status,
       o.item_type,
       o.server_name,
       p.game,
       s.status AS snapshot_status,
       s.players_online,
       s.players_max,
       s.join_address,
       s.captured_at AS snapshot_captured_at
     FROM server_public_pages spp
     INNER JOIN orders o ON o.id = spp.order_id
     LEFT JOIN plans p ON p.id = o.plan_id
     LEFT JOIN server_public_snapshots s ON s.order_id = spp.order_id
     WHERE spp.public_slug = ?
       AND spp.public_page_enabled = 1
     LIMIT 1`,
    [slug]
  );

  const row = rows?.[0];
  if (!row) {
    return { reason: 'not_found', page: null, slug, orderId: null };
  }

  if (!isOrderEligibleForPublicPage(row)) {
    return { reason: 'ineligible', page: null, slug, orderId: row.order_id };
  }

  const snapshot = buildPublicSnapshot(row);
  const stream = buildStreamPayload(row);

  return {
    reason: 'ok',
    slug,
    orderId: row.order_id,
    page: {
      slug,
      streamer_name: String(row.streamer_name || '').trim() || null,
      game: String(row.game || '').trim() || null,
      server_name: String(row.server_name || '').trim() || null,
      server_description: String(row.server_description || '').trim() || null,
      status: snapshot.status,
      players_online: snapshot.players_online,
      players_max: snapshot.players_max,
      join: snapshot.join,
      discord_url: String(row.discord_url || '').trim() || null,
      stream,
      snapshot_captured_at: snapshot.snapshot_captured_at,
      is_stale: snapshot.is_stale,
    },
  };
}

function getDirectoryStatusRank(status) {
  switch (String(status || '').toLowerCase()) {
    case 'online':
      return 0;
    case 'provisioning':
      return 1;
    case 'offline':
      return 2;
    case 'unknown':
      return 3;
    case 'error':
      return 4;
    default:
      return 5;
  }
}

export async function listPublicStreamerPages({ limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 100));
  const [rows] = await pool.execute(
    `SELECT
       spp.order_id,
       spp.public_slug,
       spp.streamer_name,
       spp.stream_platform,
       spp.stream_channel,
       spp.stream_url,
       spp.discord_url,
       spp.server_description,
       spp.kick_embed_enabled,
       spp.updated_at,
       o.status AS order_status,
       o.item_type,
       o.server_name,
       p.game,
       s.status AS snapshot_status,
       s.players_online,
       s.players_max,
       s.join_address,
       s.captured_at AS snapshot_captured_at
     FROM server_public_pages spp
     INNER JOIN orders o ON o.id = spp.order_id
     LEFT JOIN plans p ON p.id = o.plan_id
     LEFT JOIN server_public_snapshots s ON s.order_id = spp.order_id
     WHERE spp.public_page_enabled = 1
     ORDER BY spp.updated_at DESC
     LIMIT ?`,
    [safeLimit]
  );

  return rows
    .filter((row) => isOrderEligibleForPublicPage(row))
    .map((row) => {
      const snapshot = buildPublicSnapshot(row);
      const stream = buildStreamPayload(row);

      return {
        slug: String(row.public_slug || '').trim(),
        streamer_name: String(row.streamer_name || '').trim() || null,
        game: String(row.game || '').trim() || null,
        server_name: String(row.server_name || '').trim() || null,
        server_description: String(row.server_description || '').trim() || null,
        status: snapshot.status,
        players_online: snapshot.players_online,
        players_max: snapshot.players_max,
        discord_url: String(row.discord_url || '').trim() || null,
        stream,
        snapshot_captured_at: snapshot.snapshot_captured_at,
        is_stale: snapshot.is_stale,
      };
    })
    .filter((entry) => Boolean(entry.stream))
    .sort((a, b) => {
      const statusDiff = getDirectoryStatusRank(a.status) - getDirectoryStatusRank(b.status);
      if (statusDiff !== 0) return statusDiff;

      const nameA = String(a.streamer_name || a.server_name || a.game || '').toLowerCase();
      const nameB = String(b.streamer_name || b.server_name || b.game || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
}


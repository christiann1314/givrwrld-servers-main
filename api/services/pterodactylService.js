/**
 * Pterodactyl Panel service abstraction.
 *
 * - Centralizes all HTTP interactions with the Panel.
 * - Normalizes responses and error codes for downstream routes/WS handlers.
 * - Ensures PANEL_APP_KEY and Authorization headers are never leaked to logs.
 *
 * PR1 scope:
 * - No public API routes depend on this yet.
 * - No provisioning logic is changed.
 */

import { URL } from 'node:url';
import { getLogger } from '../lib/logger.js';

const logger = getLogger();

// ---------- Error contract ----------

export const PTERO_ERROR_CODES = {
  CONFIG_MISSING: 'PTERO_CONFIG_MISSING',
  CONFIG_INVALID: 'PTERO_CONFIG_INVALID',
  UNAUTHORIZED: 'PTERO_UNAUTHORIZED',
  FORBIDDEN: 'PTERO_FORBIDDEN',
  NOT_FOUND: 'PTERO_NOT_FOUND',
  RATE_LIMITED: 'PTERO_RATE_LIMITED',
  UNAVAILABLE: 'PTERO_UNAVAILABLE',
  BAD_REQUEST: 'PTERO_BAD_REQUEST',
  UNKNOWN: 'PTERO_UNKNOWN',
};

export class PterodactylError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'PterodactylError';
    this.code = code || PTERO_ERROR_CODES.UNKNOWN;
    this.httpStatus = options.httpStatus ?? 502;
    this.cause = options.cause;
    this.details = options.details ?? null;
  }
}

/**
 * Map a PterodactylError to an HTTP status + safe response payload.
 * Future route/WS handlers should use this helper to ensure consistent behavior.
 */
export function mapPterodactylErrorToHttp(error) {
  if (!(error instanceof PterodactylError)) {
    return {
      status: 502,
      body: {
        code: PTERO_ERROR_CODES.UNKNOWN,
        message: 'Upstream panel error',
      },
    };
  }

  let status = error.httpStatus;

  switch (error.code) {
    case PTERO_ERROR_CODES.CONFIG_MISSING:
    case PTERO_ERROR_CODES.CONFIG_INVALID:
      status = 500;
      break;
    case PTERO_ERROR_CODES.UNAUTHORIZED:
    case PTERO_ERROR_CODES.FORBIDDEN:
      status = 502;
      break;
    case PTERO_ERROR_CODES.NOT_FOUND:
      status = 404;
      break;
    case PTERO_ERROR_CODES.RATE_LIMITED:
      status = 429;
      break;
    case PTERO_ERROR_CODES.UNAVAILABLE:
      status = 503;
      break;
    case PTERO_ERROR_CODES.BAD_REQUEST:
      status = 400;
      break;
    default:
      status = status || 502;
  }

  return {
    status,
    body: {
      code: error.code,
      message: error.message || 'Upstream panel error',
    },
  };
}

// ---------- Configuration ----------

const rawPanelUrl = (process.env.PANEL_URL || '').trim();
const rawPanelAppKey = (process.env.PANEL_APP_KEY || '').trim();
const rawPanelClientKey = (process.env.PTERO_CLIENT_KEY || '').trim();

let panelBaseUrl = null;
let panelConfigured = false;

if (rawPanelUrl && rawPanelAppKey) {
  try {
    const url = new URL(rawPanelUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Unsupported PANEL_URL protocol: ${url.protocol}`);
    }
    // Normalize to origin (scheme + host + optional port)
    panelBaseUrl = url.origin.replace(/\/+$/, '');
    panelConfigured = true;
  } catch (err) {
    panelBaseUrl = null;
    panelConfigured = false;
    // Do not log PANEL_APP_KEY; only log safe URL + message.
    logger.error(
      {
        service: 'pterodactyl',
        panelUrl: rawPanelUrl,
        err: err?.message || String(err),
      },
      'Invalid PANEL_URL configuration'
    );
  }
} else if (rawPanelUrl || rawPanelAppKey) {
  // Partially configured; treat as invalid so downstream can surface a clear error.
  panelBaseUrl = null;
  panelConfigured = false;
  logger.error(
    {
      service: 'pterodactyl',
      panelUrl: rawPanelUrl || '<missing>',
    },
    'Pterodactyl panel is partially configured: PANEL_URL and PANEL_APP_KEY must both be set or both be empty'
  );
}

export function isPanelConfigured() {
  return panelConfigured;
}

/**
 * Panel HTTP origin for API calls (application + client).
 */
function getPanelOrigin() {
  if (panelBaseUrl) return panelBaseUrl;
  if (!rawPanelUrl) return null;
  try {
    const url = new URL(rawPanelUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Client API (user/session key). Required for server power — Application API has no /servers/{id}/power.
 * Never logs PTERO_CLIENT_KEY.
 */
async function requestClientApi(path, { method = 'GET', body } = {}) {
  const origin = getPanelOrigin();
  if (!origin || !rawPanelClientKey) {
    throw new PterodactylError(
      PTERO_ERROR_CODES.CONFIG_MISSING,
      'Pterodactyl client API is not configured (set PANEL_URL and PTERO_CLIENT_KEY for power control)',
      { httpStatus: 500 }
    );
  }

  const url = `${origin}/api/client${path}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${rawPanelClientKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    logger.error(
      {
        service: 'pterodactyl',
        url,
        method,
        err: err?.message || String(err),
      },
      'Failed to reach Pterodactyl panel (client API)'
    );
    throw new PterodactylError(
      PTERO_ERROR_CODES.UNAVAILABLE,
      'Pterodactyl panel is unavailable',
      { httpStatus: 503, cause: err }
    );
  }

  if (response.ok) {
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }
    const text = await response.text();
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      logger.error(
        {
          service: 'pterodactyl',
          url,
          method,
          status: response.status,
          err: err?.message || String(err),
        },
        'Failed to parse Pterodactyl client API JSON'
      );
      throw new PterodactylError(
        PTERO_ERROR_CODES.UNKNOWN,
        'Failed to parse Pterodactyl response',
        { httpStatus: 502, cause: err }
      );
    }
  }

  const status = response.status;
  let errorCode = PTERO_ERROR_CODES.UNKNOWN;

  if (status === 400) errorCode = PTERO_ERROR_CODES.BAD_REQUEST;
  else if (status === 401) errorCode = PTERO_ERROR_CODES.UNAUTHORIZED;
  else if (status === 403) errorCode = PTERO_ERROR_CODES.FORBIDDEN;
  else if (status === 404) errorCode = PTERO_ERROR_CODES.NOT_FOUND;
  else if (status === 429) errorCode = PTERO_ERROR_CODES.RATE_LIMITED;
  else if (status >= 500) errorCode = PTERO_ERROR_CODES.UNAVAILABLE;

  let errorText = '';
  try {
    errorText = await response.text();
  } catch {
    // ignore
  }

  logger.warn(
    {
      service: 'pterodactyl',
      url,
      method,
      status,
      code: errorCode,
    },
    'Pterodactyl client API responded with non-OK status'
  );

  throw new PterodactylError(
    errorCode,
    'Pterodactyl client API request failed',
    {
      httpStatus: status,
      details: errorText ? { raw: errorText } : undefined,
    }
  );
}

/**
 * Internal helper to perform an authenticated request against the Application API.
 * Never logs PANEL_APP_KEY or raw Authorization headers.
 */
async function requestApplicationApi(path, { method = 'GET', body } = {}) {
  if (!panelConfigured || !panelBaseUrl) {
    throw new PterodactylError(
      rawPanelUrl || rawPanelAppKey ? PTERO_ERROR_CODES.CONFIG_INVALID : PTERO_ERROR_CODES.CONFIG_MISSING,
      'Pterodactyl panel is not correctly configured',
      { httpStatus: 500 }
    );
  }

  const url = `${panelBaseUrl}/api/application${path}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${rawPanelAppKey}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      // Node fetch respects process-wide timeouts; for now we rely on external controls.
    });
  } catch (err) {
    logger.error(
      {
        service: 'pterodactyl',
        url,
        method,
        err: err?.message || String(err),
      },
      'Failed to reach Pterodactyl panel'
    );
    throw new PterodactylError(
      PTERO_ERROR_CODES.UNAVAILABLE,
      'Pterodactyl panel is unavailable',
      { httpStatus: 503, cause: err }
    );
  }

  if (response.ok) {
    try {
      return await response.json();
    } catch (err) {
      logger.error(
        {
          service: 'pterodactyl',
          url,
          method,
          status: response.status,
          err: err?.message || String(err),
        },
        'Failed to parse Pterodactyl response JSON'
      );
      throw new PterodactylError(
        PTERO_ERROR_CODES.UNKNOWN,
        'Failed to parse Pterodactyl response',
        { httpStatus: 502, cause: err }
      );
    }
  }

  const status = response.status;
  let errorCode = PTERO_ERROR_CODES.UNKNOWN;

  if (status === 400) errorCode = PTERO_ERROR_CODES.BAD_REQUEST;
  else if (status === 401) errorCode = PTERO_ERROR_CODES.UNAUTHORIZED;
  else if (status === 403) errorCode = PTERO_ERROR_CODES.FORBIDDEN;
  else if (status === 404) errorCode = PTERO_ERROR_CODES.NOT_FOUND;
  else if (status === 429) errorCode = PTERO_ERROR_CODES.RATE_LIMITED;
  else if (status >= 500) errorCode = PTERO_ERROR_CODES.UNAVAILABLE;

  let errorText = '';
  try {
    errorText = await response.text();
  } catch {
    // ignore
  }

  logger.warn(
    {
      service: 'pterodactyl',
      url,
      method,
      status,
      code: errorCode,
    },
    'Pterodactyl API responded with non-OK status'
  );

  throw new PterodactylError(
    errorCode,
    'Pterodactyl API request failed',
    {
      httpStatus: status,
      details: errorText ? { raw: errorText } : undefined,
    }
  );
}

// ---------- Public service interface ----------

/**
 * Pterodactyl Application API returns allocations as JSON:API relationship refs; full rows live in `included`.
 */
function resolvePrimaryAllocation(serverPayload) {
  const attrs = serverPayload?.attributes || {};
  const rel =
    serverPayload?.relationships?.allocations?.data || attrs.relationships?.allocations?.data;
  if (!Array.isArray(rel) || rel.length === 0) return null;

  const included = Array.isArray(serverPayload?.included) ? serverPayload.included : [];

  const resolveRef = (ref) => {
    if (!ref) return null;
    if (ref.attributes) return ref;
    const type = String(ref.type || '').toLowerCase();
    const id = String(ref.id ?? '');
    return (
      included.find(
        (inc) => String(inc.type || '').toLowerCase() === type && String(inc.id) === id
      ) || null
    );
  };

  let chosen = null;
  for (const ref of rel) {
    const full = resolveRef(ref);
    if (full?.attributes?.is_default) {
      chosen = full;
      break;
    }
  }
  if (!chosen) {
    chosen = resolveRef(rel[0]);
  }
  return chosen;
}

/**
 * Fetch static server details for a given Pterodactyl server id.
 *
 * Normalized response shape (subset of Pterodactyl Application API):
 * {
 *   id: number,
 *   identifier: string,
 *   name: string,
 *   description: string | null,
 *   limits: {
 *     memoryMb: number,
 *     diskMb: number,
 *     cpuPercent: number,
 *   },
 *   allocations: {
 *     primaryIp: string | null,
 *     primaryPort: number | null,
 *   },
 * }
 */
export async function getServerDetails(pteroServerId) {
  if (!pteroServerId && pteroServerId !== 0) {
    throw new PterodactylError(
      PTERO_ERROR_CODES.BAD_REQUEST,
      'pteroServerId is required',
      { httpStatus: 400 }
    );
  }

  const body = await requestApplicationApi(`/servers/${pteroServerId}?include=allocations`);
  const data = body?.data != null ? body.data : body;
  const merged = {
    ...data,
    included: Array.isArray(body?.included) ? body.included : data?.included || [],
  };
  const attrs = data?.attributes || {};

  const primaryAllocation = resolvePrimaryAllocation(merged);

  const ip =
    primaryAllocation?.attributes?.ip ||
    primaryAllocation?.attributes?.ip_alias ||
    primaryAllocation?.attributes?.alias ||
    null;
  const port = primaryAllocation?.attributes?.port != null
    ? Number(primaryAllocation.attributes.port)
    : null;

  return {
    id: attrs.id,
    identifier: attrs.identifier,
    name: attrs.name,
    description: attrs.description ?? null,
    limits: {
      memoryMb: Number(attrs.limits?.memory ?? 0),
      diskMb: Number(attrs.limits?.disk ?? 0),
      cpuPercent: Number(attrs.limits?.cpu ?? 0),
    },
    allocations: {
      primaryIp: ip,
      primaryPort: port,
    },
  };
}

/**
 * Fetch current resource usage and state for a server.
 *
 * Normalized response shape:
 * {
 *   state: 'online' | 'offline' | 'provisioning' | 'error' | 'unknown',
 *   cpuPercent: number,
 *   memoryBytes: number,
 *   memoryLimitBytes: number | null,
 *   diskBytes: number,
 *   playersOnline: number | null,
 *   playersMax: number | null,
 *   uptimeSeconds: number | null,
 *   measuredAt: string, // ISO timestamp
 * }
 */
export async function getServerResources(pteroServerId) {
  if (!pteroServerId && pteroServerId !== 0) {
    throw new PterodactylError(
      PTERO_ERROR_CODES.BAD_REQUEST,
      'pteroServerId is required',
      { httpStatus: 400 }
    );
  }

  const body = await requestApplicationApi(`/servers/${pteroServerId}/resources`);
  const data = body?.data != null ? body.data : body;
  const attrs = data?.attributes || {};

  const res = attrs.resources && typeof attrs.resources === 'object' ? attrs.resources : {};
  const stateRaw = String(res.current_state || attrs.current_state || attrs.state || '').toLowerCase();
  let state = 'unknown';
  if (['running', 'online'].includes(stateRaw)) state = 'online';
  else if (['stopped', 'offline'].includes(stateRaw)) state = 'offline';
  else if (['starting', 'stopping'].includes(stateRaw)) state = stateRaw;

  const nowIso = new Date().toISOString();

  const uptimeRaw = Number(res.uptime ?? attrs.uptime ?? 0);
  const uptimeSeconds =
    Number.isFinite(uptimeRaw) && uptimeRaw > 0 ? Math.max(0, Math.floor(uptimeRaw / 1000)) : 0;

  return {
    state,
    cpuPercent: Number(res.cpu_absolute ?? attrs.cpu_absolute ?? 0),
    memoryBytes: Number(res.memory_bytes ?? attrs.memory_bytes ?? 0),
    memoryLimitBytes: attrs.limits?.memory != null
      ? Number(attrs.limits.memory) * 1024 * 1024
      : null,
    diskBytes: Number(res.disk_bytes ?? attrs.disk_bytes ?? 0),
    playersOnline:
      res.players_current != null ? Number(res.players_current) : attrs.players_current != null
        ? Number(attrs.players_current)
        : null,
    playersMax:
      res.players_max != null ? Number(res.players_max) : attrs.players_max != null
        ? Number(attrs.players_max)
        : null,
    uptimeSeconds,
    measuredAt: nowIso,
  };
}

/**
 * Send a power action to a server: start, stop, restart, kill.
 *
 * Uses the **Client API** (`POST /api/client/servers/{identifier}/power`). The Application API does not
 * expose a power endpoint on current Pterodactyl Panel releases (POST there returns 405).
 *
 * @param {string} pteroIdentifier Panel server **identifier** (short id / UUID), not numeric internal id.
 * Normalized response:
 * {
 *   ok: boolean,
 *   state: 'online' | 'offline' | 'starting' | 'stopping' | 'unknown',
 * }
 */
export async function sendPowerAction(pteroIdentifier, action) {
  const allowed = new Set(['start', 'stop', 'restart', 'kill']);
  if (!allowed.has(action)) {
    throw new PterodactylError(
      PTERO_ERROR_CODES.BAD_REQUEST,
      'Invalid power action',
      { httpStatus: 400 }
    );
  }
  if (pteroIdentifier == null || String(pteroIdentifier).trim() === '') {
    throw new PterodactylError(
      PTERO_ERROR_CODES.BAD_REQUEST,
      'ptero_identifier is required',
      { httpStatus: 400 }
    );
  }

  const id = encodeURIComponent(String(pteroIdentifier).trim());
  await requestClientApi(`/servers/${id}/power`, {
    method: 'POST',
    body: { signal: action },
  });

  // We don't know the final state immediately; callers can poll resources.
  let state = 'unknown';
  if (action === 'start') state = 'starting';
  else if (action === 'stop' || action === 'kill') state = 'stopping';
  else if (action === 'restart') state = 'starting';

  return { ok: true, state };
}


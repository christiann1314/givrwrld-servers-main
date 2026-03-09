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

  const data = await requestApplicationApi(`/servers/${pteroServerId}?include=allocations`);
  const attrs = data?.attributes || {};

  const primaryAllocation = Array.isArray(attrs.relationships?.allocations?.data)
    ? attrs.relationships.allocations.data.find((alloc) => alloc.attributes?.is_default)
      || attrs.relationships.allocations.data[0]
    : null;

  const ip = primaryAllocation?.attributes?.ip || primaryAllocation?.attributes?.ip_alias || null;
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

  const data = await requestApplicationApi(`/servers/${pteroServerId}/resources`);
  const attrs = data?.attributes || {};

  const stateRaw = String(attrs.current_state || attrs.state || '').toLowerCase();
  let state = 'unknown';
  if (['running', 'online'].includes(stateRaw)) state = 'online';
  else if (['stopped', 'offline'].includes(stateRaw)) state = 'offline';
  else if (['starting', 'stopping'].includes(stateRaw)) state = stateRaw;

  const nowIso = new Date().toISOString();

  return {
    state,
    cpuPercent: Number(attrs.resources?.cpu_absolute ?? 0),
    memoryBytes: Number(attrs.resources?.memory_bytes ?? 0),
    memoryLimitBytes: attrs.limits?.memory != null
      ? Number(attrs.limits.memory) * 1024 * 1024
      : null,
    diskBytes: Number(attrs.resources?.disk_bytes ?? 0),
    playersOnline: attrs.resources?.players_current != null
      ? Number(attrs.resources.players_current)
      : null,
    playersMax: attrs.resources?.players_max != null
      ? Number(attrs.resources.players_max)
      : null,
    uptimeSeconds: attrs.resources?.uptime != null
      ? Number(attrs.resources.uptime)
      : null,
    measuredAt: nowIso,
  };
}

/**
 * Send a power action to a server: start, stop, restart, kill.
 *
 * Normalized response:
 * {
 *   ok: boolean,
 *   state: 'online' | 'offline' | 'starting' | 'stopping' | 'unknown',
 * }
 */
export async function sendPowerAction(pteroServerId, action) {
  const allowed = new Set(['start', 'stop', 'restart', 'kill']);
  if (!allowed.has(action)) {
    throw new PterodactylError(
      PTERO_ERROR_CODES.BAD_REQUEST,
      'Invalid power action',
      { httpStatus: 400 }
    );
  }
  if (!pteroServerId && pteroServerId !== 0) {
    throw new PterodactylError(
      PTERO_ERROR_CODES.BAD_REQUEST,
      'pteroServerId is required',
      { httpStatus: 400 }
    );
  }

  // Pterodactyl expects { signal: 'start'|'stop'|'restart'|'kill' }
  await requestApplicationApi(`/servers/${pteroServerId}/power`, {
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


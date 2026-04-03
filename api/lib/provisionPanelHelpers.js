import pool from '../config/database.js';

/**
 * Serialize Panel reconcile + create + DB finalize for one order (connection-scoped advisory lock).
 */
export async function withMysqlProvisionLock(orderId, fn) {
  const lockName = `givrwrld:provision:${orderId}`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT GET_LOCK(?, 120) AS l', [lockName]);
    if (Number(rows[0]?.l) !== 1) {
      throw new Error(`Could not acquire provision lock for order ${orderId} (timeout)`);
    }
    return await fn();
  } finally {
    try {
      await conn.query('SELECT RELEASE_LOCK(?) AS r', [lockName]);
    } catch {
      // ignore
    }
    conn.release();
  }
}

export function buildDeterministicServerName(order) {
  const uniqueSuffix = String(order.id || '')
    .replace(/-/g, '')
    .slice(0, 8);
  const maxBaseLen = Math.max(0, 80 - (uniqueSuffix.length + 1));
  const baseName = String(order.server_name || 'GIVRwrld Server').slice(0, maxBaseLen);
  return `${baseName}-${uniqueSuffix}`;
}

/**
 * Fallback when external_id lookup misses (e.g. client timeout after Panel create).
 * When orderIdForExternalId is set, only accept a name match if external_id is empty or equals that order id.
 */
export async function findPanelServerByExactName(
  panelUrl,
  panelAppKey,
  exactName,
  maxPages = 5,
  orderIdForExternalId = null,
) {
  const base = String(panelUrl).replace(/\/+$/, '');
  const expectExt =
    orderIdForExternalId != null && String(orderIdForExternalId).trim() !== ''
      ? String(orderIdForExternalId).trim()
      : null;
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await fetch(
      `${base}/api/application/servers?page=${page}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${panelAppKey}`,
          Accept: 'Application/vnd.pterodactyl.v1+json',
        },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    for (const row of json.data || []) {
      const attrs = row?.attributes || {};
      if (String(attrs.name || '') !== exactName) continue;
      if (expectExt != null) {
        const ext = attrs.external_id != null ? String(attrs.external_id).trim() : '';
        if (ext && ext !== expectExt) continue;
      }
      return attrs;
    }
    const meta = json.meta?.pagination;
    const totalPages = Number(meta?.total_pages);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
  }
  return null;
}

function extractAllocationsFromServerPayload(body) {
  const root = body?.data != null ? body.data : body;
  const attrs = root?.attributes || {};
  const included = Array.isArray(body?.included) ? body.included : [];
  // Pterodactyl 1.x often nests allocation relationships under attributes.relationships;
  // older/docs examples use top-level data.relationships.
  const rel =
    root?.relationships?.allocations?.data ?? attrs.relationships?.allocations?.data;

  // Some Panel responses embed the default allocation on attributes.allocation only.
  const directAlloc = attrs.allocation;
  if ((!Array.isArray(rel) || rel.length === 0) && directAlloc != null) {
    if (typeof directAlloc === 'number' && Number.isFinite(directAlloc) && directAlloc > 0) {
      return [
        {
          id: Number(directAlloc),
          port: null,
          is_default: true,
        },
      ];
    }
    if (directAlloc && typeof directAlloc === 'object' && directAlloc.id != null) {
      const id = Number(directAlloc.id);
      const port = Number(directAlloc.port);
      if (Number.isFinite(id) && id > 0) {
        return [
          {
            id,
            port: Number.isFinite(port) ? port : null,
            is_default: true,
          },
        ];
      }
    }
  }

  if (!Array.isArray(rel) || rel.length === 0) return [];

  const resolveRef = (ref) => {
    if (!ref) return null;
    if (ref.attributes) return ref;
    const type = String(ref.type || '').toLowerCase();
    const id = String(ref.id ?? '');
    return (
      included.find(
        (inc) => String(inc.type || '').toLowerCase() === type && String(inc.id) === id,
      ) || null
    );
  };

  const out = [];
  for (const ref of rel) {
    const full = resolveRef(ref);
    const a = full?.attributes || {};
    const id = Number(a.id ?? full?.id ?? ref?.id);
    const port = Number(a.port);
    if (!Number.isFinite(id) || id <= 0) continue;
    out.push({
      id,
      port: Number.isFinite(port) ? port : null,
      is_default: Boolean(a.is_default),
    });
  }
  return out;
}

const VERIFY_ALLOC_RETRY_ATTEMPTS = 12;
const VERIFY_ALLOC_RETRY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Single GET /servers/:id?include=allocations — no retry.
 * @param {string} panelUrl
 * @param {string} panelAppKey
 * @param {number} serverId
 * @param {{
 *   primaryAllocationId: number,
 *   additionalAllocationIds: number[],
 *   minAllocationCount: number,
 *   strictAllocationIds: boolean,
 * }} expected
 */
async function verifyProvisionedServerOnce(panelUrl, panelAppKey, serverId, expected) {
  const base = String(panelUrl).replace(/\/+$/, '');
  const res = await fetch(`${base}/api/application/servers/${serverId}?include=allocations`, {
    headers: {
      Authorization: `Bearer ${panelAppKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Panel GET server failed: ${text}` };
  }
  const body = await res.json();
  const attrs = body?.data?.attributes || body?.attributes || {};
  const uuid = attrs.uuid != null ? String(attrs.uuid) : '';
  if (!uuid) {
    return { ok: false, error: 'Panel server missing uuid' };
  }

  const allocs = extractAllocationsFromServerPayload(body);
  if (allocs.length < expected.minAllocationCount) {
    return {
      ok: false,
      error: `Expected at least ${expected.minAllocationCount} allocations, panel has ${allocs.length}`,
    };
  }

  const primary = allocs.find((a) => a.is_default) || allocs[0];
  if (!primary) {
    return { ok: false, error: 'No primary allocation on panel server' };
  }

  const additional = allocs.filter((a) => a.id !== primary.id);

  if (expected.strictAllocationIds) {
    if (Number(primary.id) !== Number(expected.primaryAllocationId)) {
      return {
        ok: false,
        error: `Primary allocation mismatch: panel=${primary.id} expected=${expected.primaryAllocationId}`,
      };
    }
    const expAdd = [...expected.additionalAllocationIds].map(Number).sort((a, b) => a - b);
    const gotAdd = additional
      .map((a) => a.id)
      .sort((a, b) => a - b);
    if (expAdd.length !== gotAdd.length || !expAdd.every((v, i) => v === gotAdd[i])) {
      return {
        ok: false,
        error: `Additional allocation id mismatch: panel=[${gotAdd.join(',')}] expected=[${expAdd.join(',')}]`,
      };
    }
  }

  return {
    ok: true,
    uuid,
    identifier: attrs.identifier != null ? String(attrs.identifier) : null,
    primaryAllocationId: Number(primary.id),
    primaryPort: primary.port != null && Number.isFinite(primary.port) ? Number(primary.port) : null,
    extraAllocations: additional.map((a) => ({
      allocation_id: a.id,
      port: a.port != null && Number.isFinite(a.port) ? Number(a.port) : null,
    })),
  };
}

/**
 * @param {string} panelUrl
 * @param {string} panelAppKey
 * @param {number} serverId
 * @param {{
 *   primaryAllocationId: number,
 *   additionalAllocationIds: number[],
 *   minAllocationCount: number,
 *   strictAllocationIds: boolean,
 * }} expected
 */
export async function verifyProvisionedServer(panelUrl, panelAppKey, serverId, expected) {
  let last = await verifyProvisionedServerOnce(panelUrl, panelAppKey, serverId, expected);

  for (let attempt = 2; attempt <= VERIFY_ALLOC_RETRY_ATTEMPTS; attempt++) {
    if (last.ok) return last;
    const needRetry =
      expected.minAllocationCount > 0 &&
      String(last.error || '').includes('allocations, panel has');
    if (!needRetry) return last;
    await sleep(VERIFY_ALLOC_RETRY_MS);
    last = await verifyProvisionedServerOnce(panelUrl, panelAppKey, serverId, expected);
  }

  return last;
}

export function buildProvisionMetaFromVerification(verify) {
  if (!verify?.ok) return null;
  const extra = verify.extraAllocations || [];
  return {
    ptero_server_uuid: verify.uuid,
    ptero_primary_allocation_id: verify.primaryAllocationId,
    ptero_primary_port: verify.primaryPort,
    ptero_extra_ports_json: extra.length > 0 ? JSON.stringify(extra) : null,
  };
}

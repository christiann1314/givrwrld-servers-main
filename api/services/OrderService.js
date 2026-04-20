/**
 * Order State Machine — single service layer for order status transitions.
 * Statuses: pending | paid | provisioning | provisioned | configuring | verifying | playable | failed (and legacy error, canceled).
 */
import pool from '../config/database.js';
import { getLogger } from '../lib/logger.js';
import { releaseNodeCapacityForOrder } from '../utils/mysql.js';

const log = getLogger();

/**
 * MySQL strict mode: assigning configuring/verifying/playable to an ENUM that was never widened
 * yields ER_TRUNCATED_WRONG_VALUE_FOR_FIELD / "Data truncated for column 'status'".
 */
function rethrowIfStaleOrdersStatusEnum(err, nextStatus) {
  const msg = String(err?.sqlMessage || err?.message || '');
  const errno = Number(err?.errno);
  const truncated =
    msg.includes("Data truncated for column 'status'") ||
    msg.includes('Incorrect enum value') ||
    errno === 1265 ||
    errno === 1366;
  if (!truncated) return;
  throw new Error(
    `orders.status ENUM does not allow "${nextStatus}". Apply sql/migrations/20260402120000_order_status_reachability.sql ` +
      `or run from repo root: npm run db:migrate (loads api/.env). Underlying: ${msg}`,
    { cause: err },
  );
}

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  PROVISIONING: 'provisioning',
  PROVISIONED: 'provisioned',
  CONFIGURING: 'configuring',
  VERIFYING: 'verifying',
  PLAYABLE: 'playable',
  ERROR: 'error',
  FAILED: 'failed',
  CANCELED: 'canceled',
});

const VALID_STATUSES = Object.values(ORDER_STATUS);

const ORDER_TRANSITION_GRAPH = Object.freeze({
  [ORDER_STATUS.PENDING]: new Set([ORDER_STATUS.PAID, ORDER_STATUS.CANCELED, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PAID]: new Set([ORDER_STATUS.PROVISIONING, ORDER_STATUS.CANCELED, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PROVISIONING]: new Set([ORDER_STATUS.PROVISIONED, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PROVISIONED]: new Set([ORDER_STATUS.CONFIGURING, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.CONFIGURING]: new Set([ORDER_STATUS.VERIFYING, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.VERIFYING]: new Set([ORDER_STATUS.PLAYABLE, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PLAYABLE]: new Set([]),
  [ORDER_STATUS.ERROR]: new Set([ORDER_STATUS.PROVISIONING, ORDER_STATUS.FAILED]),
  // Allow paid re-ack after a provision failure (finalize-order / webhook once subscription is ACTIVE).
  [ORDER_STATUS.FAILED]: new Set([ORDER_STATUS.PAID, ORDER_STATUS.PROVISIONING]),
  [ORDER_STATUS.CANCELED]: new Set([]),
});

function normalizeStatus(value) {
  return String(value || '').toLowerCase();
}

export function isAllowedStatusTransition(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  if (!VALID_STATUSES.includes(from) || !VALID_STATUSES.includes(to)) return false;
  if (from === to) return true; // idempotent
  const allowed = ORDER_TRANSITION_GRAPH[from];
  return Boolean(allowed && allowed.has(to));
}

function logTransition(orderId, fromStatus, toStatus) {
  log.info(
    {
      order_id: orderId,
      from_status: normalizeStatus(fromStatus),
      to_status: normalizeStatus(toStatus),
    },
    'order_status_transition',
  );
}

function logIllegalTransition(orderId, fromStatus, toStatus) {
  log.warn(
    {
      order_id: orderId,
      from_status: normalizeStatus(fromStatus),
      to_status: normalizeStatus(toStatus),
    },
    'order_status_transition_illegal',
  );
}

/**
 * Get order by id (with plan join for provisioning).
 */
export async function getOrder(orderId, withPlan = false) {
  const sql = withPlan
    ? `SELECT o.*, p.game, p.ptero_egg_id, p.ram_gb, p.vcores, p.ssd_gb
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.id = ? LIMIT 1`
    : `SELECT * FROM orders WHERE id = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [orderId]);
  return rows[0] || null;
}

/**
 * Transition order to paid (typically from pending; also allowed from failed after PayPal confirms ACTIVE).
 */
export async function transitionToPaid(orderId, paypalSubscriptionId = null, paypalPayerId = null) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) {
    return false;
  }
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.PAID)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.PAID);
    return false;
  }

  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'paid',
         paypal_subscription_id = COALESCE(?, paypal_subscription_id),
         paypal_payer_id = COALESCE(?, paypal_payer_id),
         updated_at = NOW()
     WHERE id = ? AND status = ?`,
    [paypalSubscriptionId, paypalPayerId, orderId, currentStatus]
  );
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.PAID);
    return true;
  }
  return false;
}

/**
 * Lock the order row and move paid/error/failed → provisioning, or allow retry while already provisioning.
 * Prevents duplicate checkout/webhook paths from both believing they "won" a fresh paid→provisioning transition.
 * Does not hold the lock across Panel HTTP calls — pair with MySQL GET_LOCK in the provisioner for create-time safety.
 *
 * @returns {Promise<
 *   | { action: 'not_found' }
 *   | { action: 'already_done', order: Record<string, any> }
 *   | { action: 'ineligible', order: Record<string, any> }
 *   | { action: 'proceed', order: Record<string, any>, claimedExclusive: boolean }
 * >}
 */
export async function claimOrderForProvisioning(orderId) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [rows] = await conn.execute(
      `SELECT o.*, p.game, p.ptero_egg_id, p.ram_gb, p.vcores, p.ssd_gb
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.id = ?
       FOR UPDATE`,
      [orderId],
    );
    const locked = rows[0];
    if (!locked) {
      await conn.rollback();
      conn.release();
      return { action: 'not_found' };
    }

    const stPre = normalizeStatus(locked.status);
    if (
      locked.ptero_server_id != null ||
      [
        ORDER_STATUS.PROVISIONED,
        ORDER_STATUS.CONFIGURING,
        ORDER_STATUS.VERIFYING,
        ORDER_STATUS.PLAYABLE,
      ].includes(stPre)
    ) {
      await conn.commit();
      conn.release();
      return { action: 'already_done', order: locked };
    }

    const st = normalizeStatus(locked.status);
    if (![ORDER_STATUS.PAID, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED, ORDER_STATUS.PROVISIONING].includes(st)) {
      await conn.commit();
      conn.release();
      return { action: 'ineligible', order: locked };
    }

    let claimedExclusive = false;
    if (st === ORDER_STATUS.PAID || st === ORDER_STATUS.ERROR || st === ORDER_STATUS.FAILED) {
      const [upd] = await conn.execute(
        `UPDATE orders
         SET status = 'provisioning',
             updated_at = NOW()
         WHERE id = ?
           AND status IN ('paid', 'error', 'failed')`,
        [orderId],
      );
      claimedExclusive = upd.affectedRows > 0;
    }

    await conn.commit();
    conn.release();

    const order = (await getOrder(orderId, true)) || locked;
    return { action: 'proceed', order, claimedExclusive };
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    conn.release();
    throw err;
  }
}

/**
 * Transition order to provisioning (idempotent: only if paid or already provisioning).
 */
export async function transitionToProvisioning(orderId) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) {
    return false;
  }
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.PROVISIONING)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONING);
    return false;
  }

  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'provisioning',
         updated_at = NOW()
     WHERE id = ? AND status = ?`,
    [orderId, currentStatus]
  );
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONING);
    return true;
  }
  return false;
}

/**
 * Transition to provisioned and set ptero ids.
 * @param {string} orderId
 * @param {number|null|undefined} pteroServerId
 * @param {string|null|undefined} pteroIdentifier
 * @param {{
 *   ptero_server_uuid?: string|null,
 *   ptero_primary_allocation_id?: number|null,
 *   ptero_primary_port?: number|null,
 *   ptero_extra_ports_json?: string|null,
 * } | null} [meta]
 */
export async function transitionToProvisioned(orderId, pteroServerId, pteroIdentifier, meta = null) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) {
    return false;
  }
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.PROVISIONED)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONED);
    return false;
  }

  // Do not overwrite an existing, non-null panel server binding with a different value.
  if (order.ptero_server_id != null && order.ptero_server_id !== pteroServerId) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONED);
    return false;
  }
  if (order.ptero_identifier != null && order.ptero_identifier !== pteroIdentifier) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONED);
    return false;
  }

  const setParts = [
    `status = 'provisioned'`,
    `ptero_server_id = COALESCE(?, ptero_server_id)`,
    `ptero_identifier = COALESCE(?, ptero_identifier)`,
    `error_message = NULL`,
    `last_provision_error = NULL`,
    `updated_at = NOW()`,
  ];
  const args = [pteroServerId, pteroIdentifier];

  if (meta && typeof meta === 'object') {
    if (meta.ptero_server_uuid != null && meta.ptero_server_uuid !== undefined) {
      setParts.push(`ptero_server_uuid = COALESCE(?, ptero_server_uuid)`);
      args.push(meta.ptero_server_uuid);
    }
    if (meta.ptero_primary_allocation_id != null && meta.ptero_primary_allocation_id !== undefined) {
      setParts.push(`ptero_primary_allocation_id = COALESCE(?, ptero_primary_allocation_id)`);
      args.push(meta.ptero_primary_allocation_id);
    }
    if (meta.ptero_primary_port != null && meta.ptero_primary_port !== undefined) {
      setParts.push(`ptero_primary_port = COALESCE(?, ptero_primary_port)`);
      args.push(meta.ptero_primary_port);
    }
    if (meta.ptero_extra_ports_json != null && meta.ptero_extra_ports_json !== undefined) {
      setParts.push(`ptero_extra_ports_json = COALESCE(?, ptero_extra_ports_json)`);
      args.push(meta.ptero_extra_ports_json);
    }
  }

  args.push(orderId, currentStatus);

  const [result] = await pool.execute(
    `UPDATE orders SET ${setParts.join(', ')} WHERE id = ? AND status = ?`,
    args
  );
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONED);
    // Soft capacity reservation only applies until the Panel server exists; after that,
    // Wings + Panel enforce real limits. Keeping ledger rows would double-count every
    // successful order and eventually block all new provisions ("No node capacity").
    await releaseNodeCapacityForOrder(orderId);
    return true;
  }
  return false;
}

/**
 * Post-provision worker: provisioned → configuring.
 */
export async function transitionProvisionedToConfiguring(orderId) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) return false;
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.CONFIGURING)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.CONFIGURING);
    return false;
  }
  let result;
  try {
    [result] = await pool.execute(
      `UPDATE orders SET status = 'configuring', updated_at = NOW() WHERE id = ? AND status = 'provisioned'`,
      [orderId],
    );
  } catch (e) {
    rethrowIfStaleOrdersStatusEnum(e, 'configuring');
    throw e;
  }
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.CONFIGURING);
    return true;
  }
  return false;
}

/**
 * Post-provision worker: configuring → verifying.
 */
export async function transitionConfiguringToVerifying(orderId) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) return false;
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.VERIFYING)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.VERIFYING);
    return false;
  }
  let result;
  try {
    [result] = await pool.execute(
      `UPDATE orders SET status = 'verifying', updated_at = NOW() WHERE id = ? AND status = 'configuring'`,
      [orderId],
    );
  } catch (e) {
    rethrowIfStaleOrdersStatusEnum(e, 'verifying');
    throw e;
  }
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.VERIFYING);
    return true;
  }
  return false;
}

/**
 * Post-provision worker: verifying → playable.
 */
export async function transitionVerifyingToPlayable(orderId) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) return false;
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.PLAYABLE)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.PLAYABLE);
    return false;
  }
  let result;
  try {
    [result] = await pool.execute(
      `UPDATE orders SET status = 'playable', updated_at = NOW() WHERE id = ? AND status = 'verifying'`,
      [orderId],
    );
  } catch (e) {
    rethrowIfStaleOrdersStatusEnum(e, 'playable');
    throw e;
  }
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.PLAYABLE);
    return true;
  }
  return false;
}

/**
 * Persist worker-computed join hints (columns added in 20260402130000_orders_game_reachability_display.sql).
 * @param {string} orderId
 * @param {{ hostname?: string | null, displayAddress?: string | null }} display
 */
export async function updateGameReachabilityDisplay(orderId, display) {
  if (!display || typeof display !== 'object') return { updated: false };
  const hostname = display.hostname != null ? String(display.hostname).slice(0, 255) : null;
  const displayAddress = display.displayAddress != null ? String(display.displayAddress).slice(0, 512) : null;
  if (!hostname && !displayAddress) return { updated: false };

  const setParts = [];
  const args = [];
  if (hostname) {
    setParts.push('game_brand_hostname = ?');
    args.push(hostname);
  }
  if (displayAddress) {
    setParts.push('game_display_address = ?');
    args.push(displayAddress);
  }
  args.push(orderId);
  const [result] = await pool.execute(
    `UPDATE orders SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = ?`,
    args,
  );
  return { updated: result.affectedRows > 0 };
}

/**
 * Fill NULL (or empty ptero_identifier) columns from Panel-derived metadata.
 * Does not overwrite existing non-null values.
 *
 * @param {string} orderId
 * @param {{
 *   ptero_server_id?: number|null,
 *   ptero_identifier?: string|null,
 *   ptero_server_uuid?: string|null,
 *   ptero_primary_allocation_id?: number|null,
 *   ptero_primary_port?: number|null,
 *   ptero_extra_ports_json?: string|null,
 * }} meta
 */
export async function backfillOrderProvisionMetadata(orderId, meta) {
  if (!meta || typeof meta !== 'object') {
    return { updated: false };
  }

  const setParts = [];
  const args = [];

  if (meta.ptero_server_id != null && Number.isFinite(Number(meta.ptero_server_id))) {
    setParts.push(`ptero_server_id = COALESCE(ptero_server_id, ?)`);
    args.push(Number(meta.ptero_server_id));
  }
  if (meta.ptero_identifier != null && String(meta.ptero_identifier).trim() !== '') {
    setParts.push(`ptero_identifier = COALESCE(NULLIF(TRIM(ptero_identifier), ''), ?)`);
    args.push(String(meta.ptero_identifier).trim());
  }
  if (meta.ptero_server_uuid != null && String(meta.ptero_server_uuid).trim() !== '') {
    setParts.push(`ptero_server_uuid = COALESCE(ptero_server_uuid, ?)`);
    args.push(String(meta.ptero_server_uuid).trim());
  }
  if (meta.ptero_primary_allocation_id != null && Number.isFinite(Number(meta.ptero_primary_allocation_id))) {
    setParts.push(`ptero_primary_allocation_id = COALESCE(ptero_primary_allocation_id, ?)`);
    args.push(Number(meta.ptero_primary_allocation_id));
  }
  if (meta.ptero_primary_port != null && Number.isFinite(Number(meta.ptero_primary_port))) {
    setParts.push(`ptero_primary_port = COALESCE(ptero_primary_port, ?)`);
    args.push(Number(meta.ptero_primary_port));
  }
  if (meta.ptero_extra_ports_json != null && String(meta.ptero_extra_ports_json).trim() !== '') {
    setParts.push(`ptero_extra_ports_json = COALESCE(ptero_extra_ports_json, ?)`);
    args.push(String(meta.ptero_extra_ports_json));
  }

  if (!setParts.length) {
    return { updated: false };
  }

  args.push(orderId);
  const [result] = await pool.execute(
    `UPDATE orders SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = ?`,
    args,
  );
  if (result.affectedRows > 0) {
    log.info({ order_id: orderId }, 'order_provision_metadata_backfill');
  }
  return { updated: result.affectedRows > 0 };
}

/**
 * Transition to failed (or error for backward compat).
 */
export async function transitionToFailed(orderId, errorMessage = null) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) {
    return false;
  }
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.FAILED)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.FAILED);
    return false;
  }

  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'failed',
         error_message = COALESCE(?, error_message),
         last_provision_error = COALESCE(?, last_provision_error),
         updated_at = NOW()
     WHERE id = ? AND status = ?`,
    [errorMessage, errorMessage, orderId, currentStatus]
  );
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.FAILED);
    await releaseNodeCapacityForOrder(orderId);
    return true;
  }
  return false;
}

/**
 * Transition to canceled (e.g. subscription canceled at billing provider).
 */
export async function transitionToCanceled(orderId) {
  const order = await getOrder(orderId);
  const currentStatus = normalizeStatus(order?.status);
  if (!order || !VALID_STATUSES.includes(currentStatus)) {
    return false;
  }
  if (!isAllowedStatusTransition(currentStatus, ORDER_STATUS.CANCELED)) {
    logIllegalTransition(orderId, currentStatus, ORDER_STATUS.CANCELED);
    return false;
  }

  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'canceled',
         updated_at = NOW()
     WHERE id = ? AND status = ?`,
    [orderId, currentStatus]
  );
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.CANCELED);
    await releaseNodeCapacityForOrder(orderId);
    return true;
  }
  return false;
}

/**
 * Clear Panel binding and set `paid` when the Panel server row is gone (Client API 404 for identifier).
 * Bypasses the status graph (e.g. playable → paid) because the upstream server was deleted.
 */
export async function resetGameOrderToPaidAfterPanelServerRemoved(orderId, userId, pteroIdentifier) {
  const ident = pteroIdentifier != null ? String(pteroIdentifier).trim() : '';
  if (!orderId || !userId || !ident) return { updated: false };

  const [result] = await pool.execute(
    `UPDATE orders SET
       ptero_server_id = NULL,
       ptero_identifier = NULL,
       ptero_server_uuid = NULL,
       ptero_primary_allocation_id = NULL,
       ptero_primary_port = NULL,
       ptero_extra_ports_json = NULL,
       ptero_node_id = NULL,
       game_brand_hostname = NULL,
       game_display_address = NULL,
       error_message = NULL,
       last_provision_error = NULL,
       status = 'paid',
       updated_at = NOW()
     WHERE id = ?
       AND user_id = ?
       AND item_type = 'game'
       AND ptero_identifier = ?`,
    [orderId, userId, ident]
  );
  await releaseNodeCapacityForOrder(orderId);
  if (result.affectedRows > 0) {
    log.info(
      { order_id: orderId, user_id: userId },
      'order_reset_panel_binding_404',
    );
  }
  return { updated: result.affectedRows > 0 };
}

/**
 * Reachability status with no Panel identifiers — cannot map to a server; reset to `paid`.
 */
export async function resetGameOrderToPaidWhenReachabilityOrphan(orderId, userId) {
  if (!orderId || !userId) return { updated: false };

  const [result] = await pool.execute(
    `UPDATE orders SET
       ptero_server_id = NULL,
       ptero_identifier = NULL,
       ptero_server_uuid = NULL,
       ptero_primary_allocation_id = NULL,
       ptero_primary_port = NULL,
       ptero_extra_ports_json = NULL,
       ptero_node_id = NULL,
       game_brand_hostname = NULL,
       game_display_address = NULL,
       error_message = NULL,
       last_provision_error = NULL,
       status = 'paid',
       updated_at = NOW()
     WHERE id = ?
       AND user_id = ?
       AND item_type = 'game'
       AND status IN ('provisioned','configuring','verifying','playable')
       AND (ptero_identifier IS NULL OR TRIM(ptero_identifier) = '')
       AND ptero_server_id IS NULL`,
    [orderId, userId]
  );
  await releaseNodeCapacityForOrder(orderId);
  if (result.affectedRows > 0) {
    log.info({ order_id: orderId, user_id: userId }, 'order_reset_reachability_orphan');
  }
  return { updated: result.affectedRows > 0 };
}

/**
 * Start a provisioning attempt (increment count, set last_attempt_at). Call before calling panel.
 */
export async function startProvisionAttempt(orderId) {
  await pool.execute(
    `UPDATE orders
     SET provision_attempt_count = provision_attempt_count + 1,
         last_provision_attempt_at = NOW(),
         updated_at = NOW()
     WHERE id = ?`,
    [orderId]
  );
}

/**
 * Record provisioning failure (set last_provision_error).
 */
export async function recordProvisionError(orderId, errorMessage) {
  await pool.execute(
    `UPDATE orders
     SET last_provision_error = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [errorMessage, orderId]
  );
}

/**
 * Whether this order is allowed to be provisioned (no double provision).
 * Returns false if order already has ptero_server_id or status is provisioned.
 */
export function canProvision(order) {
  if (!order) return false;
  if (order.ptero_server_id != null) return false;
  const st = String(order.status);
  if (['provisioned', 'playable', 'configuring', 'verifying'].includes(st)) return false;
  return ['paid', 'provisioning', 'error', 'failed'].includes(st);
}

/**
 * Whether we should attempt provisioning (for reconcile job): paid or provisioning, no server yet, and backoff elapsed.
 */
export function shouldRetryProvision(order, backoffMinutesByAttempt = null) {
  if (!order) return false;
  if (order.ptero_server_id != null) return false;
  if (!['paid', 'provisioning', 'error', 'failed'].includes(String(order.status))) return false;
  const attempt = Number(order.provision_attempt_count) || 0;
  const lastAt = order.last_provision_attempt_at;
  const backoffMin = backoffMinutesByAttempt
    ? backoffMinutesByAttempt(attempt)
    : Math.min(30, 5 * Math.pow(2, Math.min(attempt, 4)));
  if (!lastAt) return true;
  const elapsedMin = (Date.now() - new Date(lastAt).getTime()) / 60000;
  return elapsedMin >= backoffMin;
}

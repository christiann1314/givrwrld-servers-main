/**
 * Order State Machine — single service layer for order status transitions.
 * Statuses: pending | paid | provisioning | provisioned | failed (and legacy error, canceled).
 */
import pool from '../config/database.js';
import { getLogger } from '../lib/logger.js';

const log = getLogger();

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  PROVISIONING: 'provisioning',
  PROVISIONED: 'provisioned',
  ERROR: 'error',
  FAILED: 'failed',
  CANCELED: 'canceled',
});

const VALID_STATUSES = Object.values(ORDER_STATUS);

const ORDER_TRANSITION_GRAPH = Object.freeze({
  [ORDER_STATUS.PENDING]: new Set([ORDER_STATUS.PAID, ORDER_STATUS.CANCELED, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PAID]: new Set([ORDER_STATUS.PROVISIONING, ORDER_STATUS.CANCELED, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PROVISIONING]: new Set([ORDER_STATUS.PROVISIONED, ORDER_STATUS.ERROR, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.PROVISIONED]: new Set([]),
  [ORDER_STATUS.ERROR]: new Set([ORDER_STATUS.PROVISIONING, ORDER_STATUS.FAILED]),
  [ORDER_STATUS.FAILED]: new Set([ORDER_STATUS.PROVISIONING]),
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
 * Transition order to paid (idempotent: only if pending).
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
 */
export async function transitionToProvisioned(orderId, pteroServerId, pteroIdentifier) {
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

  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'provisioned',
         ptero_server_id = COALESCE(?, ptero_server_id),
         ptero_identifier = COALESCE(?, ptero_identifier),
         error_message = NULL,
         last_provision_error = NULL,
         updated_at = NOW()
     WHERE id = ? AND status = ?`,
    [pteroServerId, pteroIdentifier, orderId, currentStatus]
  );
  if (result.affectedRows > 0) {
    logTransition(orderId, currentStatus, ORDER_STATUS.PROVISIONED);
    return true;
  }
  return false;
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
    return true;
  }
  return false;
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
  if (String(order.status) === 'provisioned') return false;
  return ['paid', 'provisioning', 'error', 'failed'].includes(String(order.status));
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

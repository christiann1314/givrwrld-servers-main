/**
 * Order State Machine — single service layer for order status transitions.
 * Statuses: pending | paid | provisioning | provisioned | failed (and legacy error, canceled).
 */
import pool from '../config/database.js';

const VALID_STATUSES = ['pending', 'paid', 'provisioning', 'provisioned', 'error', 'failed', 'canceled'];

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
  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'paid',
         paypal_subscription_id = COALESCE(?, paypal_subscription_id),
         paypal_payer_id = COALESCE(?, paypal_payer_id),
         updated_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [paypalSubscriptionId, paypalPayerId, orderId]
  );
  return result.affectedRows > 0;
}

/**
 * Transition order to provisioning (idempotent: only if paid or already provisioning).
 */
export async function transitionToProvisioning(orderId) {
  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'provisioning',
         updated_at = NOW()
     WHERE id = ? AND status IN ('paid', 'provisioning')`,
    [orderId]
  );
  return result.affectedRows > 0;
}

/**
 * Transition to provisioned and set ptero ids.
 */
export async function transitionToProvisioned(orderId, pteroServerId, pteroIdentifier) {
  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'provisioned',
         ptero_server_id = ?,
         ptero_identifier = ?,
         error_message = NULL,
         last_provision_error = NULL,
         updated_at = NOW()
     WHERE id = ?`,
    [pteroServerId, pteroIdentifier, orderId]
  );
  return result.affectedRows > 0;
}

/**
 * Transition to failed (or error for backward compat).
 */
export async function transitionToFailed(orderId, errorMessage = null) {
  const [result] = await pool.execute(
    `UPDATE orders
     SET status = 'failed',
         error_message = COALESCE(?, error_message),
         last_provision_error = COALESCE(?, last_provision_error),
         updated_at = NOW()
     WHERE id = ?`,
    [errorMessage, errorMessage, orderId]
  );
  return result.affectedRows > 0;
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

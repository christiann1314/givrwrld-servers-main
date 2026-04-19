import bullmq from 'bullmq';
const { Queue } = bullmq;
import { getLogger } from '../lib/logger.js';
import { getBullmqRedisConnection } from '../lib/bullmqRedis.js';
import { getOrder } from '../services/OrderService.js';

const logger = getLogger();

export const QUEUE_NAME = 'post-provisioning';

let queue;

export function getProvisioningQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getBullmqRedisConnection() });
  }
  return queue;
}

/** BullMQ queue handle with a convenient `.add` for callers that expect a queue object. */
export const provisioningQueue = {
  add(jobName, data, opts) {
    return getProvisioningQueue().add(jobName, data, opts);
  },
};

const defaultJobOpts = () => ({
  attempts: Number(process.env.POST_PROVISION_JOB_ATTEMPTS || 5),
  backoff: {
    type: 'exponential',
    delay: Number(process.env.POST_PROVISION_JOB_BACKOFF_MS || 15_000),
  },
  removeOnComplete: 500,
  removeOnFail: 500,
});

/**
 * After Panel provisioning succeeds: configure reachability (TCP or nginx + HTTPS for Class C).
 * Idempotent job id per order. Optional provisionPlan avoids recomputing from DB.
 *
 * @param {{ orderId: string, serverId?: number | null, provisionPlan?: Record<string, unknown> | null }} input
 */
export async function enqueueConfigureServerJob({ orderId, serverId = null, provisionPlan = null }) {
  if (!orderId || process.env.POST_PROVISION_QUEUE_ENABLED === '0') {
    return { enqueued: false, reason: 'disabled_or_missing_id' };
  }
  const q = getProvisioningQueue();
  const jobId = `post-${String(orderId)}`;
  const data = { orderId: String(orderId) };
  if (serverId != null && Number.isFinite(Number(serverId))) {
    data.serverId = Number(serverId);
  }
  if (provisionPlan && typeof provisionPlan === 'object') {
    data.provisionPlan = provisionPlan;
  }
  try {
    const existing = await q.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.remove();
        logger.info({ order_id: orderId, job_id: jobId }, 'post_provision_job_removed_failed_for_retry');
      } else if (['active', 'waiting', 'delayed', 'paused', 'completed'].includes(state)) {
        logger.info(
          { order_id: orderId, job_id: jobId, bullmq_state: state },
          'post_provision_job_skip_already_in_queue',
        );
        return { enqueued: false, reason: 'already_in_queue', state };
      }
    }
  } catch (e) {
    logger.warn({ order_id: orderId, job_id: jobId, err: e }, 'post_provision_job_existing_cleanup_skipped');
  }
  try {
    await q.add('configure-server', data, {
      jobId,
      ...defaultJobOpts(),
    });
    logger.info(
      {
        order_id: orderId,
        has_plan: Boolean(provisionPlan),
        traffic_class: provisionPlan?.trafficClass ?? null,
        job_name: 'configure-server',
      },
      'configure_server_job_enqueued',
    );
    return { enqueued: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists|duplicate job id/i.test(msg)) {
      return { enqueued: false, reason: 'duplicate_job' };
    }
    logger.warn({ order_id: orderId, err: msg }, 'configure_server_job_enqueue_failed');
    return { enqueued: false, reason: msg };
  }
}

/**
 * Enqueue only when the order is Panel-ready but not yet in the post-provision pipeline.
 *
 * @param {string} orderId
 * @param {{ serverId?: number | null, provisionPlan?: Record<string, unknown> | null }} [extras]
 */
export async function schedulePostProvisionFollowup(orderId, extras = {}) {
  if (process.env.POST_PROVISION_QUEUE_ENABLED === '0') {
    return { scheduled: false, reason: 'disabled' };
  }
  const order = await getOrder(orderId);
  if (!order?.ptero_server_id) {
    return { scheduled: false, reason: 'no_panel_server' };
  }
  const s = String(order.status || '').toLowerCase();
  if (['playable', 'configuring', 'verifying', 'failed', 'canceled'].includes(s)) {
    return { scheduled: false, reason: `status_${s}` };
  }
  if (s !== 'provisioned') {
    return { scheduled: false, reason: `status_${s}` };
  }
  const serverId = extras.serverId != null ? extras.serverId : order.ptero_server_id;
  return enqueueConfigureServerJob({
    orderId,
    serverId,
    provisionPlan: extras.provisionPlan ?? null,
  });
}

/**
 * Remove the BullMQ post-provision job for this order (unless it is active) and enqueue a fresh one.
 * Use when orders are stuck in `verifying` after TCP/DNS failures so the worker retries with new code/env.
 *
 * @param {string} orderId
 * @param {{ statuses?: string[] }} [opts] — default only `verifying`
 */
export async function forceRequeuePostProvisionJob(orderId, opts = {}) {
  if (!orderId || process.env.POST_PROVISION_QUEUE_ENABLED === '0') {
    return { requeued: false, reason: 'disabled_or_missing_id' };
  }
  const allowed = (opts.statuses || ['verifying']).map((x) => String(x || '').toLowerCase());
  const order = await getOrder(orderId);
  if (!order?.ptero_server_id) {
    return { requeued: false, reason: 'no_panel_server' };
  }
  const s = String(order.status || '').toLowerCase();
  if (!allowed.includes(s)) {
    return { requeued: false, reason: `status_${s}_not_allowed` };
  }

  const q = getProvisioningQueue();
  const jobId = `post-${String(orderId)}`;
  try {
    const existing = await q.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'active') {
        return { requeued: false, reason: 'job_active', state };
      }
      await existing.remove();
      logger.info({ order_id: orderId, job_id: jobId, prior_state: state }, 'post_provision_job_force_removed');
    }
  } catch (e) {
    logger.warn({ order_id: orderId, err: e }, 'post_provision_job_force_remove_skipped');
  }

  const data = { orderId: String(orderId), serverId: Number(order.ptero_server_id) };
  try {
    await q.add('configure-server', data, {
      jobId,
      ...defaultJobOpts(),
    });
    logger.info({ order_id: orderId, job_id: jobId }, 'post_provision_job_force_enqueued');
    return { requeued: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ order_id: orderId, err: msg }, 'post_provision_job_force_enqueue_failed');
    return { requeued: false, reason: msg };
  }
}

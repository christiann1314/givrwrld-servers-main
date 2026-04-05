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

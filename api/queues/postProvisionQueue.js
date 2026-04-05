import bullmq from 'bullmq';
const { Queue } = bullmq;
import { getLogger } from '../lib/logger.js';
import { getBullmqRedisConnection } from '../lib/bullmqRedis.js';
import { getOrder } from '../services/OrderService.js';

const logger = getLogger();

const QUEUE_NAME = 'post-provisioning';

let queue;

export function getPostProvisionQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getBullmqRedisConnection() });
  }
  return queue;
}

/**
 * After Panel provisioning succeeds, move order toward configuring → playable on the worker.
 * Idempotent job id per order.
 */
export async function enqueuePostProvisionJob(orderId) {
  if (!orderId || process.env.POST_PROVISION_QUEUE_ENABLED === '0') {
    return { enqueued: false, reason: 'disabled_or_missing_id' };
  }
  const q = getPostProvisionQueue();
  const jobId = `post-${String(orderId)}`;
  try {
    await q.add(
      'configure-server',
      { orderId: String(orderId) },
      {
        jobId,
        attempts: Number(process.env.POST_PROVISION_JOB_ATTEMPTS || 5),
        backoff: {
          type: 'exponential',
          delay: Number(process.env.POST_PROVISION_JOB_BACKOFF_MS || 15_000),
        },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    );
    logger.info({ order_id: orderId }, 'post_provision_job_enqueued');
    return { enqueued: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists|duplicate job id/i.test(msg)) {
      return { enqueued: false, reason: 'duplicate_job' };
    }
    logger.warn({ order_id: orderId, err: msg }, 'post_provision_job_enqueue_failed');
    return { enqueued: false, reason: msg };
  }
}

/**
 * Enqueue only when the order is Panel-ready but not yet in the post-provision pipeline.
 */
export async function schedulePostProvisionFollowup(orderId) {
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
  return enqueuePostProvisionJob(orderId);
}

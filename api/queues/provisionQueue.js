import bullmq from 'bullmq';
const { Queue } = bullmq;
import { getLogger } from '../lib/logger.js';
import { getBullmqRedisConnection } from '../lib/bullmqRedis.js';

const logger = getLogger();

let queue;

export function getProvisionQueue() {
  if (!queue) {
    queue = new Queue('provisioning', { connection: getBullmqRedisConnection() });
  }
  return queue;
}

/**
 * Enqueue a provisioning job for an order.
 * Idempotent via jobId = orderId.
 */
export async function enqueueProvisionJob(orderId, source = 'unknown') {
  if (!orderId) {
    throw new Error('orderId is required to enqueue provision job');
  }
  const q = getProvisionQueue();
  const jobId = String(orderId);
  try {
    const existing = await q.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.remove();
        logger.info({ order_id: jobId, source }, 'provision_job_removed_failed_for_retry');
      } else if (['active', 'waiting', 'delayed', 'paused'].includes(state)) {
        logger.info(
          { order_id: jobId, source, bullmq_state: state },
          'provision_job_skip_already_in_queue',
        );
        return;
      }
    }
  } catch (e) {
    logger.warn({ order_id: jobId, source, err: e }, 'provision_job_existing_cleanup_skipped');
  }
  const job = await q.add(
    'provision',
    { orderId: jobId, source },
    {
      jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 30_000,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  );
  const bullmqState = job ? await job.getState() : null;
  logger.info({ order_id: jobId, source, bullmq_state: bullmqState }, 'provision_job_enqueued');
}


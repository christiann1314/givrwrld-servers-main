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
  await q.add(
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
  logger.info({ order_id: jobId, source }, 'provision_job_enqueued');
}


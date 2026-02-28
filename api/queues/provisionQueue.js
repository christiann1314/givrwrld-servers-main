import bullmq from 'bullmq';
const { Queue, QueueScheduler } = bullmq;
import { getLogger } from '../lib/logger.js';

const logger = getLogger();

let queue;
let scheduler;

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    return { url };
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    db: Number(process.env.REDIS_DB || 0),
  };
}

export function getProvisionQueue() {
  if (!queue) {
    const connection = getRedisConnection();
    queue = new Queue('provisioning', { connection });
    scheduler = new QueueScheduler('provisioning', { connection });
    scheduler.waitUntilReady().catch((err) => {
      logger.error({ err }, 'Provision queue scheduler failed to start');
    });
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


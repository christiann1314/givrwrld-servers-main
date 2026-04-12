#!/usr/bin/env node

import '../config/loadEnv.js';
import { Worker } from 'bullmq';
import { getLogger } from '../lib/logger.js';
import { getBullmqRedisConnection } from '../lib/bullmqRedis.js';
import { provisionServer } from '../routes/servers.js';

const logger = getLogger();

const connection = getBullmqRedisConnection();

logger.info({ connection }, 'provision_worker_starting');

const worker = new Worker(
  'provisioning',
  async (job) => {
    const orderId = job.data?.orderId;
    if (!orderId) {
      logger.warn({ job_id: job.id }, 'provision_worker_missing_order_id');
      return;
    }

    const source = job.data?.source || 'queue';
    const meta = {
      order_id: orderId,
      job_id: job.id,
      attempt: job.attemptsMade + 1,
      source,
    };

    logger.info(meta, 'provision_worker_job_start');

    try {
      const result = await provisionServer(orderId);
      logger.info({ ...meta, result }, 'provision_worker_job_success');
      return result;
    } catch (err) {
      logger.error({ ...meta, err }, 'provision_worker_job_error');
      throw err;
    }
  },
  {
    connection,
    concurrency: Number(process.env.PROVISION_WORKER_CONCURRENCY || 2),
  },
);

worker.on('completed', (job) => {
  logger.info(
    {
      order_id: job.data?.orderId,
      job_id: job.id,
      returnvalue: job.returnvalue,
    },
    'provision_worker_job_completed',
  );
});

worker.on('failed', (job, err) => {
  logger.error(
    {
      order_id: job?.data?.orderId,
      job_id: job?.id,
      err,
    },
    'provision_worker_job_failed',
  );
});


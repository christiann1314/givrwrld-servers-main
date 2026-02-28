#!/usr/bin/env node

import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLogger } from '../lib/logger.js';
import { provisionServer } from '../routes/servers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from api/.env when running standalone
dotenv.config({ path: path.join(__dirname, '../.env') });

const logger = getLogger();

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

const connection = getRedisConnection();

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


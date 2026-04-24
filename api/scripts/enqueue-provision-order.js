#!/usr/bin/env node
/**
 * Enqueue a BullMQ provisioning job (requires Redis + provisioner worker).
 * Usage: node api/scripts/enqueue-provision-order.js <order_uuid>
 */
import '../config/loadEnv.js';
import { enqueueProvisionJob, getProvisionQueue } from '../queues/provisionQueue.js';

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: node api/scripts/enqueue-provision-order.js <order_id>');
  process.exit(1);
}

await enqueueProvisionJob(orderId, 'enqueue-provision-order-script');
console.log('Enqueued:', orderId);
try {
  await getProvisionQueue().close();
} catch {
  // ignore
}

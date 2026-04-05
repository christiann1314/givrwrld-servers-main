/**
 * Back-compat re-exports — canonical implementation lives in `api/queue/provisioningQueue.js`.
 */
import {
  getProvisioningQueue,
  provisioningQueue,
  enqueueConfigureServerJob,
  schedulePostProvisionFollowup,
  QUEUE_NAME,
} from '../queue/provisioningQueue.js';

export {
  getProvisioningQueue,
  provisioningQueue,
  enqueueConfigureServerJob,
  schedulePostProvisionFollowup,
  QUEUE_NAME,
};

export const getPostProvisionQueue = getProvisioningQueue;

/** @deprecated Prefer enqueueConfigureServerJob({ orderId, serverId, provisionPlan }). */
export async function enqueuePostProvisionJob(orderId) {
  return enqueueConfigureServerJob({ orderId });
}

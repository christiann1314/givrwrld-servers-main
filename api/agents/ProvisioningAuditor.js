/**
 * ProvisioningAuditor: every 15 minutes, find orders stuck in paid/provisioning
 * beyond threshold and call safe retry (reconcile pass). Logs actions.
 */
import { runReconcilePass } from '../jobs/reconcile-provisioning.js';

const STUCK_THRESHOLD_MINUTES = Number(process.env.AGENT_STUCK_ORDER_MINUTES) || 10;

function logAdapter(agentLog) {
  return {
    info: (data, msg) => agentLog('info', data, msg),
    error: (data, msg) => agentLog('error', data, msg),
  };
}

export function registerProvisioningAuditor(register) {
  register('ProvisioningAuditor', '*/15 * * * *', async (log) => {
    log('info', { threshold_minutes: STUCK_THRESHOLD_MINUTES }, 'ProvisioningAuditor run');
    const count = await runReconcilePass(logAdapter(log));
    log('info', { orders_attempted: count }, 'ProvisioningAuditor completed');
  });
}

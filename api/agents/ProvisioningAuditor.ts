/**
 * ProvisioningAuditor: every 5 min, find orders in (paid, provisioning) older than 10 min.
 * No ptero_server_id => call provisionServer (idempotent). Has ptero_server_id => verify in Panel; if missing => mark failed + alert.
 */
import pool from '../config/database.js';
import { provisionServer } from '../routes/servers.js';
import { transitionToFailed } from '../services/OrderService.js';
import { sendAlert } from '../lib/alertClient.js';

const STUCK_AGE_MS = 10 * 60 * 1000; // 10 minutes
const PANEL_URL = process.env.PANEL_URL;
const PANEL_APP_KEY = process.env.PANEL_APP_KEY;

export type LogFn = (level: 'info' | 'warn' | 'error', event: string, details?: Record<string, unknown>) => void;

function hasPteroId(o: { ptero_server_id?: string | number | null }): boolean {
  const id = o.ptero_server_id;
  return id != null && id !== '' && Number(id) !== 0;
}

async function panelServerExists(serverId: string | number): Promise<boolean> {
  if (!PANEL_URL || !PANEL_APP_KEY) return false;
  try {
    const url = `${String(PANEL_URL).replace(/\/+$/, '')}/api/application/servers/${serverId}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PANEL_APP_KEY}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
      },
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function run(runId: string, log: LogFn): Promise<void> {
  const threshold = Date.now() - STUCK_AGE_MS;
  let rows: { id: string; status: string; ptero_server_id?: string | number | null; created_at: Date }[] = [];
  try {
    const [r] = await pool.execute(
      `SELECT id, status, ptero_server_id, created_at FROM orders
       WHERE status IN ('paid', 'provisioning')
         AND item_type = 'game'
         AND created_at < ?
       ORDER BY created_at ASC`,
      [new Date(threshold)]
    );
    rows = (r as typeof rows);
  } catch (e: unknown) {
    log('error', 'ProvisioningAuditor_query', { error: e instanceof Error ? e.message : String(e) });
    return;
  }

  log('info', 'ProvisioningAuditor_run', { stuck_count: rows.length, threshold_minutes: 10 });

  for (const order of rows) {
    const orderId = order.id;
    if (!hasPteroId(order)) {
      try {
        await provisionServer(orderId);
        log('info', 'ProvisioningAuditor_retry', { order_id: orderId });
      } catch (e: unknown) {
        log('error', 'ProvisioningAuditor_retry_failed', {
          order_id: orderId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      continue;
    }

    const pteroId = String(order.ptero_server_id);
    const exists = await panelServerExists(pteroId);
    if (exists) continue;

    await transitionToFailed(orderId, `Panel server ${pteroId} not found (auditor)`);
    log('warn', 'ProvisioningAuditor_marked_failed', { order_id: orderId, ptero_server_id: pteroId });
    await sendAlert(
      `provision:missing:${orderId}`,
      'GIVRwrld Provision',
      `Order ${orderId} had ptero_server_id ${pteroId} but server missing in Panel. Marked failed.`
    );
  }

  log('info', 'ProvisioningAuditor_done', { audited: rows.length });
}

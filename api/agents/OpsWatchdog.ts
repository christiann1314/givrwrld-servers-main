/**
 * OpsWatchdog: every 60s check API health, DB, Panel. On failure: log + Discord (rate-limited).
 */
import pool from '../config/database.js';
import { sendAlert } from '../lib/alertClient.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const COOLDOWN_KEY = 'ops:watchdog';

export type LogFn = (level: 'info' | 'warn' | 'error', event: string, details?: Record<string, unknown>) => void;

export async function run(runId: string, log: LogFn): Promise<void> {
  const snapshot: Record<string, unknown> = {
    db: false,
    api: false,
    panel: false,
    ts: new Date().toISOString(),
  };

  // DB
  try {
    await pool.execute('SELECT 1');
    snapshot.db = true;
  } catch (e: unknown) {
    snapshot.db_error = e instanceof Error ? e.message : String(e);
  }

  // API health (GET /api/health)
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/api/health`);
    const data = (await res.json()) as { ok?: boolean; db?: boolean; panel?: boolean };
    snapshot.api = res.ok && data.ok === true;
    snapshot.panel = data.panel === true;
    if (!snapshot.api) snapshot.api_status = res.status;
  } catch (e: unknown) {
    snapshot.api_error = e instanceof Error ? e.message : String(e);
  }

  // If Panel not already set by /api/health, do a lightweight Panel check
  if (snapshot.panel !== true && process.env.PANEL_URL && process.env.PANEL_APP_KEY) {
    try {
      const url = `${String(process.env.PANEL_URL).replace(/\/+$/, '')}/api/application/nodes?per_page=1`;
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.PANEL_APP_KEY}`,
          Accept: 'Application/vnd.pterodactyl.v1+json',
        },
      });
      snapshot.panel = r.ok;
    } catch {
      snapshot.panel = false;
    }
  }

  log('info', 'OpsWatchdog_snapshot', snapshot);

  const ok = snapshot.db === true && snapshot.api === true;
  if (ok) return;

  const issues: string[] = [];
  if (snapshot.db !== true) issues.push('db');
  if (snapshot.api !== true) issues.push('api');
  if (snapshot.panel !== true) issues.push('panel');
  const alertKey = `${COOLDOWN_KEY}:${issues.join('-')}`;
  const sent = await sendAlert(
    alertKey,
    'GIVRwrld Ops',
    `Check failed: ${issues.join(', ')}. DB=${snapshot.db} API=${snapshot.api} Panel=${snapshot.panel}`
  );
  if (sent) log('warn', 'OpsWatchdog_alert_sent', { alertKey });
}

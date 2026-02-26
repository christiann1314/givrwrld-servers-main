/**
 * OpsWatchdog: every 5 minutes, check DB connectivity and API health; log status snapshot.
 */
import pool from '../config/database.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

export function registerOpsWatchdog(register) {
  register('OpsWatchdog', '*/5 * * * *', async (log) => {
    const snapshot = { db: false, api: false, api_status: null, ts: new Date().toISOString() };
    try {
      await pool.execute('SELECT 1');
      snapshot.db = true;
    } catch (e) {
      snapshot.db_error = e?.message || String(e);
    }
    try {
      const res = await fetch(`${API_BASE}/health`);
      snapshot.api = res.ok;
      if (res.ok) snapshot.api_status = await res.json();
      else snapshot.api_status = { status: res.status };
    } catch (e) {
      snapshot.api_error = e?.message || String(e);
    }
    log('info', snapshot, 'OpsWatchdog snapshot');
  });
}

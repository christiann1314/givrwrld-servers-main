/**
 * DailyKPIDigest: once daily at 9:00 AM local VPS time.
 * Log + optional Discord: new paid (24h), MRR estimate, failed provisions (24h), avg provision time (24h).
 */
import pool from '../config/database.js';
import { sendAlert } from '../lib/alertClient.js';

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

export type LogFn = (level: 'info' | 'warn' | 'error', event: string, details?: Record<string, unknown>) => void;

export async function run(runId: string, log: LogFn): Promise<void> {
  const since = new Date(Date.now() - TWENTY_FOUR_H_MS);
  const digest: Record<string, unknown> = {
    period_hours: 24,
    since: since.toISOString(),
  };

  try {
    // New paid orders (last 24h): use paid_at if present, else updated_at where status in paid/provisioning/provisioned
    let newPaid = 0;
    try {
      const [paidCol] = await pool.execute<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'paid_at'`
      );
      if (paidCol.length > 0) {
        const [r] = await pool.execute<[{ cnt: number }]>(
          `SELECT COUNT(*) AS cnt FROM orders WHERE paid_at >= ?`,
          [since]
        );
        newPaid = r[0]?.cnt ?? 0;
      } else {
        const [r] = await pool.execute<[{ cnt: number }]>(
          `SELECT COUNT(*) AS cnt FROM orders WHERE status IN ('paid','provisioning','provisioned') AND updated_at >= ?`,
          [since]
        );
        newPaid = r[0]?.cnt ?? 0;
      }
    } catch {
      const [r] = await pool.execute<[{ cnt: number }]>(
        `SELECT COUNT(*) AS cnt FROM orders WHERE status IN ('paid','provisioning','provisioned') AND updated_at >= ?`,
        [since]
      );
      newPaid = r[0]?.cnt ?? 0;
    }
    digest.new_paid_24h = newPaid;

    // MRR: active (provisioned) orders, sum of monthly equivalent from plans
    const [mrrRows] = await pool.execute<
      { term: string; price_monthly: number; price_quarterly: number | null; price_semiannual: number | null; price_yearly: number | null }[]
    >(
      `SELECT o.term,
              COALESCE(p.price_monthly, 0) AS price_monthly,
              p.price_quarterly, p.price_semiannual, p.price_yearly
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.status = 'provisioned' AND o.item_type = 'game'`
    );
    let mrr = 0;
    const pm = (v: number | null) => Number(v) || 0;
    for (const row of mrrRows) {
      const term = String(row.term || 'monthly').toLowerCase();
      const monthly = pm(row.price_monthly);
      let monthlyEquivalent = monthly;
      if (term === 'quarterly') monthlyEquivalent = (row.price_quarterly != null ? Number(row.price_quarterly) : monthly * 3) / 3;
      else if (term === 'semiannual') monthlyEquivalent = (row.price_semiannual != null ? Number(row.price_semiannual) : monthly * 6) / 6;
      else if (term === 'yearly') monthlyEquivalent = (row.price_yearly != null ? Number(row.price_yearly) : monthly * 12) / 12;
      mrr += monthlyEquivalent;
    }
    digest.mrr_estimate = Math.round(mrr * 100) / 100;

    // Failed provisions (last 24h)
    const [failedRows] = await pool.execute<[{ cnt: number }]>(
      `SELECT COUNT(*) AS cnt FROM orders WHERE status = 'failed' AND updated_at >= ?`,
      [since]
    );
    digest.failed_provisions_24h = failedRows[0]?.cnt ?? 0;

    // Avg provision time (paid -> provisioned in last 24h). Use paid_at if set, else created_at; provisioned time = updated_at.
    let avgProvisionMs: number | null = null;
    try {
      const [timeRows] = await pool.execute<
        { paid_ts: string; provisioned_ts: string }[]
      >(
        `SELECT
          COALESCE(paid_at, created_at) AS paid_ts,
          updated_at AS provisioned_ts
         FROM orders
         WHERE status = 'provisioned' AND updated_at >= ?
         ORDER BY updated_at DESC LIMIT 500`,
        [since]
      );
      if (timeRows.length > 0) {
        let total = 0;
        for (const r of timeRows) {
          const paid = new Date(r.paid_ts).getTime();
          const prov = new Date(r.provisioned_ts).getTime();
          total += prov - paid;
        }
        avgProvisionMs = total / timeRows.length;
      }
    } catch (_) {}
    digest.avg_provision_time_ms = avgProvisionMs;
    digest.avg_provision_time_seconds = avgProvisionMs != null ? Math.round(avgProvisionMs / 1000) : null;

    log('info', 'DailyKPIDigest', digest);

    const webhookUrl = process.env.DISCORD_ALERT_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.trim()) {
      const body = [
        `New paid (24h): ${newPaid}`,
        `MRR estimate: $${digest.mrr_estimate}`,
        `Failed (24h): ${digest.failed_provisions_24h}`,
        avgProvisionMs != null ? `Avg provision: ${Math.round(avgProvisionMs / 1000)}s` : 'Avg provision: N/A',
      ].join('\n');
      await sendAlert('kpi:daily', 'GIVRwrld Daily KPI', body);
    }
  } catch (e: unknown) {
    log('error', 'DailyKPIDigest_error', { error: e instanceof Error ? e.message : String(e) });
  }
}

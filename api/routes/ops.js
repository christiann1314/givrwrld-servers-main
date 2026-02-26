/**
 * Ops summary endpoint: order counts by status, last webhook time, stuck orders count.
 */
import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * GET /ops/summary
 * Minimal ops view: order counts by status, last webhook received_at, stuck (paid/provisioning without server) count.
 */
router.get('/summary', async (req, res) => {
  try {
    const [statusRows] = await pool.execute(
      `SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status`
    );
    const ordersByStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.cnt)]));

    let lastWebhook = null;
    try {
      const [wh] = await pool.execute(
        `SELECT MAX(received_at) AS last_at FROM paypal_webhook_events LIMIT 1`
      );
      const lastAt = wh?.[0]?.last_at;
      lastWebhook = lastAt instanceof Date ? lastAt.toISOString() : (lastAt ?? null);
    } catch {
      // table may not exist yet (run Phase 1 migration)
    }

    const [stuck] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE status IN ('paid', 'provisioning', 'error', 'failed')
         AND (ptero_server_id IS NULL OR ptero_server_id = 0)
         AND item_type = 'game'`
    );
    const stuckOrdersCount = Number(stuck?.[0]?.cnt ?? 0);

    res.json({
      ordersByStatus,
      lastWebhookReceivedAt: lastWebhook,
      stuckOrdersCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * Admin-only routes: all tickets, reply as staff, close ticket, metrics.
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getMetricsSnapshot } from '../lib/metrics.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

/** GET /api/admin/tickets - list all tickets */
router.get('/tickets', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.id, t.user_id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
              u.email AS user_email, u.display_name AS user_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.updated_at DESC`
    );
    res.json({ success: true, tickets: rows });
  } catch (err) {
    console.error('Admin list tickets error:', err);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
});

/** GET /api/admin/tickets/:id - get ticket + messages */
router.get('/tickets/:id', async (req, res) => {
  try {
    const [tickets] = await pool.execute(
      `SELECT t.id, t.user_id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
              u.email AS user_email, u.display_name AS user_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const [messages] = await pool.execute(
      `SELECT m.id, m.ticket_id, m.user_id, m.is_staff, m.message, m.created_at
       FROM ticket_messages m WHERE m.ticket_id = ? ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, ticket: tickets[0], messages });
  } catch (err) {
    console.error('Admin get ticket error:', err);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

/** POST /api/admin/tickets/:id/messages - reply as staff */
router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const [tickets] = await pool.execute(`SELECT id, status FROM tickets WHERE id = ?`, [req.params.id]);
    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const { message } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ error: 'message is required' });
    const msgId = uuidv4();
    await pool.execute(
      `INSERT INTO ticket_messages (id, ticket_id, user_id, is_staff, message) VALUES (?, ?, ?, 1, ?)`,
      [msgId, req.params.id, req.userId, String(message).slice(0, 65535)]
    );
    await pool.execute(`UPDATE tickets SET updated_at = NOW(), status = 'pending' WHERE id = ?`, [req.params.id]);
    res.status(201).json({ success: true, message: { id: msgId, is_staff: true } });
  } catch (err) {
    console.error('Admin reply error:', err);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

/** PATCH /api/admin/tickets/:id - update status (open, pending, closed) */
router.patch('/tickets/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['open', 'pending', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status must be open, pending, or closed' });
    }
    const [result] = await pool.execute(`UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?`, [
      status,
      req.params.id,
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, status });
  } catch (err) {
    console.error('Admin update ticket error:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

/** GET /api/admin/metrics - metrics snapshot for dashboard */
router.get('/metrics', async (req, res) => {
  try {
    const snapshot = getMetricsSnapshot ? getMetricsSnapshot() : {};
    const [orderCount] = await pool.execute(
      `SELECT COUNT(*) AS total FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const [provisionedCount] = await pool.execute(
      `SELECT COUNT(*) AS total FROM orders WHERE status = 'provisioned' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    res.json({
      success: true,
      metrics: { ...snapshot, ordersLast24h: orderCount[0]?.total ?? 0, provisionedLast24h: provisionedCount[0]?.total ?? 0 },
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

export default router;

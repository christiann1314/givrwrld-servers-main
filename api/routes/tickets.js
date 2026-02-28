/**
 * User-facing ticket routes: list own tickets, create, view thread, add message.
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/** GET /api/tickets - list current user's tickets */
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, subject, category, priority, status, created_at, updated_at
       FROM tickets WHERE user_id = ? ORDER BY updated_at DESC`,
      [req.userId]
    );
    res.json({ success: true, tickets: rows });
  } catch (err) {
    console.error('List tickets error:', err);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
});

/** POST /api/tickets - create ticket */
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, category, priority, message } = req.body || {};
    if (!subject || !message) {
      return res.status(400).json({ error: 'subject and message are required' });
    }
    const id = uuidv4();
    const cat = ['general', 'billing', 'technical'].includes(category) ? category : 'general';
    const pri = ['low', 'normal', 'high'].includes(priority) ? priority : 'normal';
    await pool.execute(
      `INSERT INTO tickets (id, user_id, subject, category, priority, status) VALUES (?, ?, ?, ?, ?, 'open')`,
      [id, req.userId, String(subject).slice(0, 200), cat, pri]
    );
    const msgId = uuidv4();
    await pool.execute(
      `INSERT INTO ticket_messages (id, ticket_id, user_id, is_staff, message) VALUES (?, ?, ?, 0, ?)`,
      [msgId, id, req.userId, String(message).slice(0, 65535)]
    );
    res.status(201).json({ success: true, ticket: { id, subject, category: cat, priority: pri, status: 'open' } });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/** GET /api/tickets/:id - get ticket + messages (owner only) */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [tickets] = await pool.execute(
      `SELECT id, user_id, subject, category, priority, status, created_at, updated_at FROM tickets WHERE id = ?`,
      [req.params.id]
    );
    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (tickets[0].user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const [messages] = await pool.execute(
      `SELECT m.id, m.ticket_id, m.user_id, m.is_staff, m.message, m.created_at
       FROM ticket_messages m WHERE m.ticket_id = ? ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, ticket: tickets[0], messages });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

/** POST /api/tickets/:id/messages - add message (owner only; staff reply is via admin route) */
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const [tickets] = await pool.execute(`SELECT id, user_id, status FROM tickets WHERE id = ?`, [req.params.id]);
    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (tickets[0].user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    if (tickets[0].status === 'closed') return res.status(400).json({ error: 'Ticket is closed' });
    const { message } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ error: 'message is required' });
    const msgId = uuidv4();
    await pool.execute(
      `INSERT INTO ticket_messages (id, ticket_id, user_id, is_staff, message) VALUES (?, ?, ?, 0, ?)`,
      [msgId, req.params.id, req.userId, String(message).slice(0, 65535)]
    );
    await pool.execute(`UPDATE tickets SET updated_at = NOW() WHERE id = ?`, [req.params.id]);
    res.status(201).json({ success: true, message: { id: msgId, message: String(message).trim() } });
  } catch (err) {
    console.error('Add message error:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;

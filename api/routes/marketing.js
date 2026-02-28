/**
 * Marketing drafts API: list and update status (for draft review flow).
 * GET /api/marketing/drafts - list drafts, optional filter by channel/status
 * PATCH /api/marketing/drafts/:id - set status to 'posted' or 'discarded'
 */
import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/marketing/drafts
 * Query: channel (discord|reddit|tiktok), status (draft|sent_to_discord|posted|discarded)
 */
router.get('/drafts', async (req, res) => {
  try {
    const { channel, status } = req.query;
    let sql = `
      SELECT id, event_id, channel, type, title, body_json, status, created_at, posted_at, notes
      FROM marketing_content_drafts
      WHERE 1=1
    `;
    const params = [];
    if (channel) {
      sql += ' AND channel = ?';
      params.push(channel);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';

    const [rows] = await pool.execute(sql, params);
    const drafts = rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      channel: r.channel,
      type: r.type,
      title: r.title,
      bodyJson: typeof r.body_json === 'string' ? JSON.parse(r.body_json) : r.body_json,
      status: r.status,
      createdAt: r.created_at,
      postedAt: r.posted_at,
      notes: r.notes,
    }));
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/marketing/drafts/:id
 * Body: { status: 'posted' | 'discarded', notes?: string }
 */
router.patch('/drafts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status || !['posted', 'discarded'].includes(status)) {
      return res.status(400).json({ error: 'status must be "posted" or "discarded"' });
    }

    const updates = ['status = ?'];
    const params = [status];
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (status === 'posted') {
      updates.push('posted_at = COALESCE(posted_at, NOW())');
    }
    params.push(id);

    const [result] = await pool.execute(
      `UPDATE marketing_content_drafts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.json({ ok: true, id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

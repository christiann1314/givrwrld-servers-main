/**
 * Affiliate signup (partner identity + referral code). No billing or payout logic.
 */
import express from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/** Generate a short unique code (alphanumeric, 10 chars) */
function generateCode() {
  return crypto.randomBytes(5).toString('hex');
}

/**
 * POST /api/affiliates/signup
 * Register current user as affiliate; get or create referral code. No payment flow changes.
 */
router.post('/signup', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.execute(
      `SELECT user_id, code FROM affiliates WHERE user_id = ? LIMIT 1`,
      [req.userId]
    );
    if (existing.length > 0) {
      return res.json({
        success: true,
        code: existing[0].code,
        message: 'Already registered as affiliate',
      });
    }
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const [dup] = await pool.execute(`SELECT 1 FROM affiliates WHERE code = ? LIMIT 1`, [code]);
      if (dup.length === 0) break;
      code = generateCode();
      attempts++;
    }
    await pool.execute(
      `INSERT INTO affiliates (user_id, code) VALUES (?, ?)`,
      [req.userId, code]
    );
    res.status(201).json({
      success: true,
      code,
      message: 'Affiliate account created',
    });
  } catch (err) {
    console.error('Affiliate signup error:', err);
    res.status(500).json({ error: 'Failed to register as affiliate' });
  }
});

/**
 * GET /api/affiliates/me
 * Get current user's affiliate code if they have one. Authenticated only.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT user_id, code, created_at FROM affiliates WHERE user_id = ? LIMIT 1`,
      [req.userId]
    );
    if (rows.length === 0) {
      return res.json({ success: true, affiliate: null });
    }
    res.json({ success: true, affiliate: { code: rows[0].code, created_at: rows[0].created_at } });
  } catch (err) {
    console.error('Affiliate me error:', err);
    res.status(500).json({ error: 'Failed to load affiliate info' });
  }
});

export default router;

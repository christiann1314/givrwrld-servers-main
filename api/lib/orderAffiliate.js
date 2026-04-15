/**
 * Order creation with optional affiliate attribution in same transaction.
 * No billing or provisioning logic; attribution only.
 */
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';

/**
 * Insert order and, if referralCode matches an affiliate, insert attribution in same transaction.
 * @param {Object} params - { orderId, userId, item_type, plan_id, term, region, server_name }
 * @param {string} [referralCode] - Optional affiliate code from link/cookie
 */
export async function createOrderWithAttribution(params, referralCode) {
  const { orderId, userId, item_type, plan_id, term, region, server_name, parent_order_id } = params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO orders (id, user_id, parent_order_id, item_type, plan_id, term, region, server_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [orderId, userId, parent_order_id || null, item_type, plan_id, term, region, server_name]
    );
    if (referralCode && String(referralCode).trim()) {
      const [rows] = await conn.execute(
        `SELECT user_id FROM affiliates WHERE code = ? LIMIT 1`,
        [String(referralCode).trim()]
      );
      if (rows.length > 0) {
        await conn.execute(
          `INSERT INTO order_affiliate_attribution (id, order_id, affiliate_user_id) VALUES (?, ?, ?)`,
          [uuidv4(), orderId, rows[0].user_id]
        );
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

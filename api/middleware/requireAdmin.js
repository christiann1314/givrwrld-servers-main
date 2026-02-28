/**
 * Require the authenticated user to have the admin (or moderator) role.
 * Must be used after authenticate middleware.
 */
import pool from '../config/database.js';

export async function requireAdmin(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT r.code FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.code IN ('admin', 'moderator')`,
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    }
    req.adminRole = rows[0].code;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

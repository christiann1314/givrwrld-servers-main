/**
 * One-off: grant admin role to a user by email.
 * Uses api/.env for DB config. Run from repo root: node api/scripts/grant-admin.js
 * Usage: node api/scripts/grant-admin.js christiann1314@gmail.com
 */
import pool from '../config/database.js';

const email = process.argv[2] || 'christiann1314@gmail.com';

async function main() {
  const [rows] = await pool.execute(
    `INSERT IGNORE INTO user_roles (id, user_id, role_id)
     SELECT UUID(), u.id, r.id
     FROM users u
     CROSS JOIN roles r
     WHERE u.email = ? AND r.code = 'admin'
     LIMIT 1`,
    [email]
  );
  if (rows.affectedRows === 0) {
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length === 0) {
      console.error('No user found with email:', email);
      console.error('Sign up first with that email, then run this again.');
    } else {
      console.log('User already has admin role:', email);
    }
    process.exit(1);
  }
  console.log('Admin role granted to:', email);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

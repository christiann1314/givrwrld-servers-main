-- Grant admin role to a user by email (local/testing).
-- Run from project root, e.g.:
--   mysql -u root -p your_db_name < sql/grant_admin_by_email.sql
-- Or run the INSERT in your MySQL client after changing the email below.

INSERT IGNORE INTO user_roles (id, user_id, role_id)
SELECT UUID(), u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'christiann1314@gmail.com' AND r.code = 'admin'
LIMIT 1;

# Admin access

The **Admin** item in the dashboard sidebar is only visible to users with the `admin` or `moderator` role. Normal users do not see it.

## Granting admin by email (one step)

User must already exist (sign up first with that email if needed). Then run:

```sql
INSERT IGNORE INTO user_roles (id, user_id, role_id)
SELECT UUID(), u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'christiann1314@gmail.com' AND r.code = 'admin'
LIMIT 1;
```

Replace `christiann1314@gmail.com` with the desired email. After the next login (or refresh of the dashboard), the Admin link will appear and `/dashboard/admin` will be accessible.

## Granting admin by user ID

1. Get the user's ID from `users` (e.g. `SELECT id FROM users WHERE email = '...'`).
2. Run:

```sql
INSERT IGNORE INTO user_roles (id, user_id, role_id)
VALUES (UUID(), '<user_id>', (SELECT id FROM roles WHERE code = 'admin' LIMIT 1));
```

Replace `<user_id>` with the user's UUID from `users.id`.

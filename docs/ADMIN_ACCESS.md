# Admin access

The **Admin** item in the dashboard sidebar is only visible to users with the `admin` or `moderator` role. Normal users do not see it.

## Granting admin to a user

1. Get the user's ID (e.g. from `users` table by email).
2. Run:

```sql
INSERT IGNORE INTO user_roles (id, user_id, role_id)
VALUES (UUID(), '<user_id>', (SELECT id FROM roles WHERE code = 'admin' LIMIT 1));
```

Replace `<user_id>` with the user's UUID from `users.id`.

After the next login (or session refresh), the Admin link will appear in the dashboard and `/dashboard/admin` will be accessible.

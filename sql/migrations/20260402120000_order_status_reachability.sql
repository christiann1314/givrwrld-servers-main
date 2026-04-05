-- Post-provision reachability: configuring → verifying → playable (Class C HTTPS, log checks, etc.)
-- Rollback: restore previous ENUM (omit new values) — only run if no rows use new statuses.

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'pending',
    'paid',
    'provisioning',
    'provisioned',
    'configuring',
    'verifying',
    'playable',
    'error',
    'canceled',
    'failed'
  ) NOT NULL DEFAULT 'pending';

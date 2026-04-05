-- Report: game orders that look provisioned but are missing canonical Panel fields.
-- Use after migration 20260327140000_orders_provision_allocation_ports.sql (adds ptero_server_uuid, etc.).
-- Re-queue provision or run provision API for these order ids to drain via already_done backfill/recovery.
--
-- Multi-port egg ids must stay aligned with api/config/gameRuntimePolicy.js (getAllocationsNeededForEgg).
--
-- Age columns use existing orders timestamps (no provisioned_at column until you add one via migration).
-- last_provision_attempt_at / provision_attempt_count come from migrations/20260220000000_phase1_order_idempotency.sql

SELECT
  o.id AS order_id,
  o.status,
  o.plan_id,
  p.ptero_egg_id,
  o.ptero_server_id,
  o.ptero_identifier,
  o.ptero_server_uuid,
  o.ptero_primary_allocation_id,
  o.ptero_primary_port,
  o.ptero_extra_ports_json,
  o.created_at,
  o.updated_at,
  o.last_provision_attempt_at,
  o.provision_attempt_count,
  TIMESTAMPDIFF(MINUTE, o.updated_at, NOW()) AS age_minutes_since_row_update,
  TIMESTAMPDIFF(
    MINUTE,
    COALESCE(o.last_provision_attempt_at, o.updated_at),
    NOW()
  ) AS approx_minutes_since_provision_activity,
  CASE
    WHEN o.status <> 'provisioning' THEN NULL
    WHEN TIMESTAMPDIFF(
        MINUTE,
        COALESCE(o.last_provision_attempt_at, o.updated_at),
        NOW()
      ) >= 120
    THEN 'stale_provisioning_2h_plus'
    WHEN TIMESTAMPDIFF(
        MINUTE,
        COALESCE(o.last_provision_attempt_at, o.updated_at),
        NOW()
      ) >= 15
    THEN 'stale_provisioning_15m_plus'
    ELSE 'provisioning_recent'
  END AS provisioning_stuck_hint,
  CASE
    WHEN o.ptero_server_id IS NULL THEN 'missing_ptero_server_id'
    WHEN o.ptero_identifier IS NULL OR TRIM(o.ptero_identifier) = '' THEN 'missing_ptero_identifier'
    WHEN o.ptero_server_uuid IS NULL OR TRIM(o.ptero_server_uuid) = '' THEN 'missing_ptero_server_uuid'
    WHEN o.ptero_primary_allocation_id IS NULL THEN 'missing_ptero_primary_allocation_id'
    WHEN o.ptero_primary_port IS NULL THEN 'missing_ptero_primary_port'
    WHEN p.ptero_egg_id IN (65, 66, 70, 74, 75)
      AND (
        o.ptero_extra_ports_json IS NULL
        OR TRIM(o.ptero_extra_ports_json) = ''
        OR TRIM(o.ptero_extra_ports_json) = '[]'
        OR TRIM(o.ptero_extra_ports_json) = 'null'
      )
    THEN 'missing_ptero_extra_ports_json'
    ELSE 'incomplete_other'
  END AS gap_reason
FROM orders o
LEFT JOIN plans p ON p.id = o.plan_id
WHERE o.item_type = 'game'
  AND o.status IN ('provisioned', 'provisioning')
  AND (
    o.ptero_server_id IS NULL
    OR o.ptero_identifier IS NULL
    OR TRIM(o.ptero_identifier) = ''
    OR o.ptero_server_uuid IS NULL
    OR TRIM(o.ptero_server_uuid) = ''
    OR o.ptero_primary_allocation_id IS NULL
    OR o.ptero_primary_port IS NULL
    OR (
      p.ptero_egg_id IN (65, 66, 70, 74, 75)
      AND (
        o.ptero_extra_ports_json IS NULL
        OR TRIM(o.ptero_extra_ports_json) = ''
        OR TRIM(o.ptero_extra_ports_json) = '[]'
        OR TRIM(o.ptero_extra_ports_json) = 'null'
      )
    )
  )
ORDER BY o.updated_at DESC;

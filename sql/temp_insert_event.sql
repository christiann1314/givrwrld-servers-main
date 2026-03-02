USE app_core;
INSERT INTO marketing_events (id, event_type, event_key, source, payload_json, occurred_at, created_at)
VALUES (
  UUID(),
  'node_online',
  CONCAT('node_online_sample_', REPLACE(UUID(), '-', '')),
  'manual',
  '{"region":"US East","cpu":"Ryzen 7 9800X3D","storage":"NVMe SSD"}',
  NOW(),
  NOW()
);

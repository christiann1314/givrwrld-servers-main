USE app_core;
INSERT INTO marketing_events (id, event_type, event_key, source, payload_json, occurred_at, created_at)
VALUES (
  UUID(),
  'scheduled_content',
  CONCAT('scheduled_', REPLACE(UUID(), '-', '')),
  'manual',
  JSON_OBJECT(
    'theme', 'Why cheap hosting lags',
    'pillar', 'education',
    'game', 'Minecraft'
  ),
  NOW(),
  NOW()
);

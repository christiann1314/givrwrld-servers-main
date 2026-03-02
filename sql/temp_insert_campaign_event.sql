USE app_core;
INSERT INTO marketing_events (id, event_type, event_key, source, payload_json, occurred_at, created_at)
VALUES (
  UUID(),
  'campaign_ad',
  CONCAT('campaign_ad_sample_', REPLACE(UUID(), '-', '')),
  'manual',
  JSON_OBJECT(
    'game', 'Minecraft',
    'offer', '20% off your first month',
    'plan', 'Starter-2G',
    'expires_at', DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 7 DAY), '%Y-%m-%d')
  ),
  NOW(),
  NOW()
);


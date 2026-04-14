-- Seed upgrade packages and add-on plans into the plans table.
-- The checkout route auto-seeds these at runtime via ensureAddonPlansSeeded(),
-- but this migration ensures they exist before any user interaction.

INSERT INTO plans (id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly, display_name, description, is_active, created_at, updated_at)
VALUES
  ('upgrade-givrwrld-essentials',    'vps', 'addons', 0, 0, 0,  6.99, 'GIVRwrld Essentials',        'Complete server management toolkit with backups, analytics, and priority support.', 1, NOW(), NOW()),
  ('upgrade-game-expansion-pack',    'vps', 'addons', 0, 0, 0, 14.99, 'Game Expansion Pack',         'Cross-deploy to multiple game types with shared resources and load balancing.',      1, NOW(), NOW()),
  ('upgrade-community-pack',         'vps', 'addons', 0, 0, 0,  4.99, 'Community Pack',              'Connect with creators, get spotlights, dev blog access, and beta features.',        1, NOW(), NOW()),
  ('addon-cpu-boost-1vcpu',          'vps', 'addons', 0, 0, 0,  5.99, 'CPU Boost (+1 vCPU)',         'Add one dedicated vCPU for peak workloads.',                                       1, NOW(), NOW()),
  ('addon-priority-resource-allocation','vps','addons',0, 0, 0,  4.99, 'Priority Resource Allocation','Higher scheduler priority during contention.',                                     1, NOW(), NOW()),
  ('addon-additional-ssd-50gb',      'vps', 'addons', 0, 0, 0,  3.99, 'Additional SSD (+50GB)',      'Add 50GB of high-speed NVMe storage.',                                             1, NOW(), NOW()),
  ('addon-enhanced-backup-retention','vps', 'addons', 0, 0, 0,  3.99, 'Enhanced Backup Retention',   'Extended backup windows with safer restore points.',                               1, NOW(), NOW()),
  ('addon-discord-integration',      'vps', 'addons', 0, 0, 0,  2.99, 'Discord Integration',         'Send server activity and alerts to your community.',                               1, NOW(), NOW()),
  ('addon-pro-analytics',            'vps', 'addons', 0, 0, 0,  5.99, 'Pro Analytics',               'Executive-level visibility into usage and performance trends.',                     1, NOW(), NOW()),
  ('addon-extra-database',           'vps', 'addons', 0, 0, 0,  2.49, 'Extra Database',              'Provision one additional managed database.',                                       1, NOW(), NOW()),
  ('addon-extra-port-allocation',    'vps', 'addons', 0, 0, 0,  1.99, 'Extra Port Allocation',       'Add one more external port assignment.',                                           1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  price_monthly = VALUES(price_monthly),
  display_name  = VALUES(display_name),
  description   = VALUES(description),
  is_active     = 1,
  updated_at    = NOW();

-- Populate games table with your supported games
INSERT INTO public.games (name, slug, description, docker_image, startup_command, egg_id) VALUES
('Minecraft', 'minecraft', 'Minecraft - the classic game from Mojang. With support for Vanilla MC, Spigot, and many others!', 'quay.io/pterodactyl/core:java', 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}', 1),
('Rust', 'rust', 'A game where you must fight to survive.', 'quay.io/parkervcp/pterodactyl-images:debian_rust', './RustDedicated -batchmode -nographics -silent-crashes +server.port {{SERVER_PORT}} +server.identity "rust" +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname "{{HOSTNAME}}" +server.level "{{LEVEL}}" +server.description "{{DESCRIPTION}}" +server.url "{{SERVER_URL}}" +server.headerimage "{{SERVER_IMG}}" +server.maxplayers {{MAX_PLAYERS}} +rcon.password "{{RCON_PASS}}" +server.saveinterval {{SAVEINTERVAL}} +app.port {{APP_PORT}} $( [ "$ADDITIONAL_ARGS" == "0" ] && printf %s "" || printf %s "$ADDITIONAL_ARGS" )', 4),
('Palworld', 'palworld', 'Palworld servers with Mammal and Teamwork 3', 'steamcmd_debianghcr_io/parkervcp/steamcmd-debian', './PalServer.sh -port={{SERVER_PORT}} -publicport={{SERVER_PORT}} -servername="{{SERVER_NAME}}" -players={{MAX_PLAYERS}} -adminpassword="{{ADMIN_PASSWORD}}" -serverpassword="{{SERVER_PASSWORD}}"', 15)
ON CONFLICT (slug) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
docker_image = EXCLUDED.docker_image,
startup_command = EXCLUDED.startup_command,
egg_id = EXCLUDED.egg_id;

-- Populate plans for each game
INSERT INTO public.plans (game_id, name, slug, description, price_monthly, cpu_cores, ram_gb, disk_gb, max_players, stripe_price_id_monthly) VALUES
((SELECT id FROM games WHERE slug = 'minecraft'), 'Basic Minecraft', 'minecraft-basic', 'Perfect for small groups', 9.99, 1, 2, 10, 10, 'price_minecraft_basic_monthly'),
((SELECT id FROM games WHERE slug = 'minecraft'), 'Standard Minecraft', 'minecraft-standard', 'Great for medium communities', 19.99, 2, 4, 20, 20, 'price_minecraft_standard_monthly'),
((SELECT id FROM games WHERE slug = 'minecraft'), 'Premium Minecraft', 'minecraft-premium', 'Best for large servers', 39.99, 4, 8, 40, 50, 'price_minecraft_premium_monthly'),

((SELECT id FROM games WHERE slug = 'rust'), 'Basic Rust', 'rust-basic', 'Perfect for small groups', 14.99, 2, 3, 15, 50, 'price_rust_basic_monthly'),
((SELECT id FROM games WHERE slug = 'rust'), 'Standard Rust', 'rust-standard', 'Great for medium communities', 29.99, 3, 6, 30, 100, 'price_rust_standard_monthly'),
((SELECT id FROM games WHERE slug = 'rust'), 'Premium Rust', 'rust-premium', 'Best for large servers', 49.99, 4, 12, 50, 200, 'price_rust_premium_monthly'),

((SELECT id FROM games WHERE slug = 'palworld'), 'Basic Palworld', 'palworld-basic', 'Perfect for small groups', 12.99, 2, 4, 20, 8, 'price_palworld_basic_monthly'),
((SELECT id FROM games WHERE slug = 'palworld'), 'Standard Palworld', 'palworld-standard', 'Great for medium communities', 24.99, 3, 6, 30, 16, 'price_palworld_standard_monthly'),
((SELECT id FROM games WHERE slug = 'palworld'), 'Premium Palworld', 'palworld-premium', 'Best for large servers', 44.99, 4, 8, 40, 32, 'price_palworld_premium_monthly')
ON CONFLICT (slug) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
price_monthly = EXCLUDED.price_monthly,
cpu_cores = EXCLUDED.cpu_cores,
ram_gb = EXCLUDED.ram_gb,
disk_gb = EXCLUDED.disk_gb,
max_players = EXCLUDED.max_players;

-- Add some popular bundles
INSERT INTO public.bundles (name, slug, description, price_monthly, features, stripe_price_id_monthly) VALUES
('Basic Management', 'basic-management', 'Essential server management tools', 4.99, '["Automated backups", "Basic monitoring", "Support ticket priority"]', 'price_basic_mgmt_monthly'),
('Pro Management', 'pro-management', 'Advanced server management and optimization', 9.99, '["Automated backups", "Advanced monitoring", "Performance optimization", "Priority support", "Custom domains"]', 'price_pro_mgmt_monthly'),
('Enterprise Management', 'enterprise-management', 'Full enterprise features and white-label options', 19.99, '["Everything in Pro", "White-label branding", "API access", "Custom integrations", "Dedicated support"]', 'price_enterprise_mgmt_monthly')
ON CONFLICT (slug) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
price_monthly = EXCLUDED.price_monthly,
features = EXCLUDED.features;

-- Add some popular addons
INSERT INTO public.addons (name, slug, description, price_monthly, category, stripe_price_id_monthly) VALUES
('DDoS Protection', 'ddos-protection', 'Enterprise-grade DDoS protection for your server', 9.99, 'security', 'price_ddos_protection_monthly'),
('Automated Backups', 'auto-backups', 'Daily automated backups with 30-day retention', 4.99, 'backup', 'price_auto_backups_monthly'),
('Performance Monitor', 'performance-monitor', 'Real-time performance monitoring and alerts', 7.99, 'monitoring', 'price_perf_monitor_monthly'),
('Extra Storage', 'extra-storage', 'Additional 50GB SSD storage for your server', 5.99, 'storage', 'price_extra_storage_monthly'),
('Priority Support', 'priority-support', '24/7 priority support with faster response times', 12.99, 'support', 'price_priority_support_monthly')
ON CONFLICT (slug) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
price_monthly = EXCLUDED.price_monthly,
category = EXCLUDED.category;
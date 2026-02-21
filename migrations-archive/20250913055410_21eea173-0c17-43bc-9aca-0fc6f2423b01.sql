-- Clean up duplicate entries first
DELETE FROM public.plans WHERE id NOT IN (
    SELECT DISTINCT ON (slug) id FROM public.plans ORDER BY slug, created_at
);

-- Drop existing constraints if they exist  
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_slug_unique;
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_slug_unique;
ALTER TABLE public.bundles DROP CONSTRAINT IF EXISTS bundles_slug_unique;
ALTER TABLE public.addons DROP CONSTRAINT IF EXISTS addons_slug_unique;

-- Add unique constraints properly
ALTER TABLE public.games ADD CONSTRAINT games_slug_unique UNIQUE (slug);
ALTER TABLE public.plans ADD CONSTRAINT plans_slug_unique UNIQUE (slug);
ALTER TABLE public.bundles ADD CONSTRAINT bundles_slug_unique UNIQUE (slug);
ALTER TABLE public.addons ADD CONSTRAINT addons_slug_unique UNIQUE (slug);

-- Clear and repopulate with proper data
TRUNCATE public.games CASCADE;
TRUNCATE public.plans CASCADE;
TRUNCATE public.bundles CASCADE;
TRUNCATE public.addons CASCADE;

-- Add games for your server
INSERT INTO public.games (name, slug, description, docker_image, startup_command, egg_id) VALUES
('Minecraft', 'minecraft', 'Minecraft - the classic game from Mojang. With support for Vanilla MC, Spigot, and many others!', 'quay.io/pterodactyl/core:java', 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}', 1),
('Rust', 'rust', 'A game where you must fight to survive.', 'quay.io/parkervcp/pterodactyl-images:debian_rust', './RustDedicated -batchmode -nographics -silent-crashes +server.port {{SERVER_PORT}} +server.identity "rust" +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname "{{HOSTNAME}}" +server.level "{{LEVEL}}" +server.description "{{DESCRIPTION}}" +server.url "{{SERVER_URL}}" +server.headerimage "{{SERVER_IMG}}" +server.maxplayers {{MAX_PLAYERS}} +rcon.password "{{RCON_PASS}}" +server.saveinterval {{SAVEINTERVAL}} +app.port {{APP_PORT}}', 4),
('Palworld', 'palworld', 'Palworld servers with Mammal and Teamwork 3', 'steamcmd_debianghcr_io/parkervcp/steamcmd-debian', './PalServer.sh -port={{SERVER_PORT}} -publicport={{SERVER_PORT}} -servername="{{SERVER_NAME}}" -players={{MAX_PLAYERS}} -adminpassword="{{ADMIN_PASSWORD}}" -serverpassword="{{SERVER_PASSWORD}}"', 15);

-- Add pricing plans
INSERT INTO public.plans (game_id, name, slug, description, price_monthly, cpu_cores, ram_gb, disk_gb, max_players) VALUES
((SELECT id FROM games WHERE slug = 'minecraft'), 'Basic Minecraft', 'minecraft-basic', 'Perfect for small groups', 9.99, 1, 2, 10, 10),
((SELECT id FROM games WHERE slug = 'minecraft'), 'Standard Minecraft', 'minecraft-standard', 'Great for medium communities', 19.99, 2, 4, 20, 20),
((SELECT id FROM games WHERE slug = 'minecraft'), 'Premium Minecraft', 'minecraft-premium', 'Best for large servers', 39.99, 4, 8, 40, 50),
((SELECT id FROM games WHERE slug = 'rust'), 'Basic Rust', 'rust-basic', 'Perfect for small groups', 14.99, 2, 3, 15, 50),
((SELECT id FROM games WHERE slug = 'rust'), 'Standard Rust', 'rust-standard', 'Great for medium communities', 29.99, 3, 6, 30, 100),
((SELECT id FROM games WHERE slug = 'rust'), 'Premium Rust', 'rust-premium', 'Best for large servers', 49.99, 4, 12, 50, 200),
((SELECT id FROM games WHERE slug = 'palworld'), 'Basic Palworld', 'palworld-basic', 'Perfect for small groups', 12.99, 2, 4, 20, 8),
((SELECT id FROM games WHERE slug = 'palworld'), 'Standard Palworld', 'palworld-standard', 'Great for medium communities', 24.99, 3, 6, 30, 16),
((SELECT id FROM games WHERE slug = 'palworld'), 'Premium Palworld', 'palworld-premium', 'Best for large servers', 44.99, 4, 8, 40, 32);

-- Add service bundles
INSERT INTO public.bundles (name, slug, description, price_monthly, features) VALUES
('Basic Management', 'basic-management', 'Essential server management tools', 4.99, '["Automated backups", "Basic monitoring", "Support ticket priority"]'),
('Pro Management', 'pro-management', 'Advanced server management and optimization', 9.99, '["Automated backups", "Advanced monitoring", "Performance optimization", "Priority support", "Custom domains"]'),
('Enterprise Management', 'enterprise-management', 'Full enterprise features and white-label options', 19.99, '["Everything in Pro", "White-label branding", "API access", "Custom integrations", "Dedicated support"]');

-- Add addons
INSERT INTO public.addons (name, slug, description, price_monthly, category) VALUES
('DDoS Protection', 'ddos-protection', 'Enterprise-grade DDoS protection for your server', 9.99, 'security'),
('Automated Backups', 'auto-backups', 'Daily automated backups with 30-day retention', 4.99, 'backup'),
('Performance Monitor', 'performance-monitor', 'Real-time performance monitoring and alerts', 7.99, 'monitoring'),
('Extra Storage', 'extra-storage', 'Additional 50GB SSD storage for your server', 5.99, 'storage'),
('Priority Support', 'priority-support', '24/7 priority support with faster response times', 12.99, 'support');
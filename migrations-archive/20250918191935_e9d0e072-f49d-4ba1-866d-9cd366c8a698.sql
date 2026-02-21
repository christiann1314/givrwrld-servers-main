-- Add live_stats column to store real-time data from Pterodactyl
ALTER TABLE user_servers ADD COLUMN IF NOT EXISTS live_stats JSONB DEFAULT '{}'::jsonb;
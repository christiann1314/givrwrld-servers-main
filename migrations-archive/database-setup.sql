-- GIVRwrld Production Database Setup
-- Run this script in Supabase SQL Editor

-- =====================================================
-- STEP 1: Clean up existing conflicting tables
-- =====================================================

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.server_stats_cache CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.user_servers CASCADE;
DROP TABLE IF EXISTS public.user_billing CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.user_stats CASCADE;
DROP TABLE IF EXISTS public.external_accounts CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;
DROP TABLE IF EXISTS public.addons CASCADE;
DROP TABLE IF EXISTS public.modpacks CASCADE;
DROP TABLE IF EXISTS public.ptero_nodes CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- STEP 2: Create profiles table with trigger
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle profile updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- STEP 3: Create catalog tables (plans, addons, modpacks)
-- =====================================================

-- Plans table for game servers and VPS
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('game', 'vps')),
  game TEXT NULL, -- minecraft, rust, palworld (null for VPS)
  ram_gb INTEGER NOT NULL,
  vcores INTEGER NOT NULL,
  ssd_gb INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Addons table for additional services
CREATE TABLE public.addons (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('game', 'vps')),
  display_name TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Modpacks table for game server configurations
CREATE TABLE public.modpacks (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pterodactyl nodes for capacity management
CREATE TABLE public.ptero_nodes (
  id SERIAL PRIMARY KEY,
  pterodactyl_node_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  max_ram_gb INTEGER NOT NULL,
  max_disk_gb INTEGER NOT NULL,
  reserved_headroom_gb INTEGER DEFAULT 2,
  enabled BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- STEP 4: Create orders table (main business logic)
-- =====================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('game', 'vps')),
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  term TEXT NOT NULL CHECK (term IN ('monthly', 'quarterly', 'yearly')),
  region TEXT NOT NULL,
  server_name TEXT NOT NULL,
  modpack_id TEXT NULL REFERENCES public.modpacks(id),
  addons JSONB DEFAULT '[]'::jsonb,
  stripe_sub_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'provisioning', 'provisioned', 'error', 'canceled')),
  node_id INTEGER REFERENCES public.ptero_nodes(id),
  pterodactyl_server_id INTEGER,
  pterodactyl_server_identifier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- STEP 5: Create supporting tables
-- =====================================================

-- External accounts for Pterodactyl integration
CREATE TABLE public.external_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pterodactyl_user_id INTEGER,
  panel_username TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now()
);

-- Affiliates table for referral system
CREATE TABLE public.affiliates (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  credits_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- STEP 6: Enable RLS on all tables
-- =====================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modpacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptero_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: Create RLS policies
-- =====================================================

-- Orders policies (users can only see their own)
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- External accounts policies
CREATE POLICY "Users can view own external accounts" ON public.external_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own external accounts" ON public.external_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own external accounts" ON public.external_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Affiliates policies
CREATE POLICY "Users can view own affiliate data" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own affiliate data" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own affiliate data" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for catalog tables
CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active addons" ON public.addons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active modpacks" ON public.modpacks
  FOR SELECT USING (is_active = true);

-- Service role access for ptero_nodes
CREATE POLICY "Service role can manage ptero_nodes" ON public.ptero_nodes
  FOR ALL TO service_role;

-- =====================================================
-- STEP 8: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_plan_id ON public.orders(plan_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_sub_id ON public.orders(stripe_sub_id);
CREATE INDEX IF NOT EXISTS idx_ptero_nodes_region ON public.ptero_nodes(region);
CREATE INDEX IF NOT EXISTS idx_ptero_nodes_enabled ON public.ptero_nodes(enabled);
CREATE INDEX IF NOT EXISTS idx_plans_game ON public.plans(game);
CREATE INDEX IF NOT EXISTS idx_plans_item_type ON public.plans(item_type);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates(code);

-- =====================================================
-- STEP 9: Create triggers
-- =====================================================

-- Trigger for updated_at on orders
CREATE TRIGGER handle_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- STEP 10: Seed production data
-- =====================================================

-- Insert plans (UPDATE THESE WITH YOUR ACTUAL STRIPE PRICE IDs)
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('mc-4gb', 'game', 'minecraft', 4, 2, 20, 'price_minecraft_4gb_monthly', 'Minecraft 4GB'),
  ('mc-8gb', 'game', 'minecraft', 8, 4, 40, 'price_minecraft_8gb_monthly', 'Minecraft 8GB'),
  ('mc-16gb', 'game', 'minecraft', 16, 8, 80, 'price_minecraft_16gb_monthly', 'Minecraft 16GB'),
  ('rust-6gb', 'game', 'rust', 6, 3, 30, 'price_rust_6gb_monthly', 'Rust 6GB'),
  ('rust-12gb', 'game', 'rust', 12, 6, 60, 'price_rust_12gb_monthly', 'Rust 12GB'),
  ('palworld-8gb', 'game', 'palworld', 8, 4, 40, 'price_palworld_8gb_monthly', 'Palworld 8GB'),
  ('palworld-16gb', 'game', 'palworld', 16, 8, 80, 'price_palworld_16gb_monthly', 'Palworld 16GB'),
  ('vps-basic', 'vps', null, 4, 2, 40, 'price_vps_basic_monthly', 'Basic VPS'),
  ('vps-standard', 'vps', null, 8, 4, 80, 'price_vps_standard_monthly', 'Standard VPS'),
  ('vps-premium', 'vps', null, 16, 8, 160, 'price_vps_premium_monthly', 'Premium VPS')
ON CONFLICT (id) DO NOTHING;

-- Insert addons
INSERT INTO public.addons (id, item_type, display_name, stripe_price_id) VALUES
  ('backup-daily', 'game', 'Daily Backups', 'price_backup_daily'),
  ('backup-hourly', 'game', 'Hourly Backups', 'price_backup_hourly'),
  ('ddos-protection', 'game', 'DDoS Protection', 'price_ddos_protection'),
  ('priority-support', 'game', 'Priority Support', 'price_priority_support'),
  ('vps-backup', 'vps', 'VPS Backups', 'price_vps_backup'),
  ('vps-monitoring', 'vps', 'Advanced Monitoring', 'price_vps_monitoring')
ON CONFLICT (id) DO NOTHING;

-- Insert modpacks
INSERT INTO public.modpacks (id, game, display_name, slug) VALUES
  ('vanilla', 'minecraft', 'Vanilla Minecraft', 'vanilla'),
  ('forge-latest', 'minecraft', 'Forge (Latest)', 'forge-latest'),
  ('fabric-latest', 'minecraft', 'Fabric (Latest)', 'fabric-latest'),
  ('ftb-academy', 'minecraft', 'FTB Academy', 'ftb-academy'),
  ('all-mods-7', 'minecraft', 'All The Mods 7', 'all-mods-7'),
  ('rust-vanilla', 'rust', 'Vanilla Rust', 'rust-vanilla'),
  ('rust-modded', 'rust', 'Modded Rust', 'rust-modded'),
  ('palworld-vanilla', 'palworld', 'Vanilla Palworld', 'palworld-vanilla')
ON CONFLICT (id) DO NOTHING;

-- Insert pterodactyl nodes (UPDATE WITH YOUR ACTUAL NODE IDs)
INSERT INTO public.ptero_nodes (pterodactyl_node_id, name, region, max_ram_gb, max_disk_gb) VALUES
  (1, 'US-East-1', 'east', 64, 1000),
  (2, 'US-West-1', 'west', 64, 1000),
  (3, 'EU-Central-1', 'eu', 64, 1000)
ON CONFLICT (pterodactyl_node_id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that everything was created successfully
SELECT 'profiles' as table_name, count(*) as count FROM public.profiles
UNION ALL
SELECT 'plans', count(*) FROM public.plans
UNION ALL
SELECT 'addons', count(*) FROM public.addons
UNION ALL
SELECT 'modpacks', count(*) FROM public.modpacks
UNION ALL
SELECT 'ptero_nodes', count(*) FROM public.ptero_nodes
UNION ALL
SELECT 'orders', count(*) FROM public.orders
UNION ALL
SELECT 'external_accounts', count(*) FROM public.external_accounts
UNION ALL
SELECT 'affiliates', count(*) FROM public.affiliates;

-- Show the plans that were created
SELECT id, item_type, game, display_name, stripe_price_id FROM public.plans ORDER BY item_type, game;

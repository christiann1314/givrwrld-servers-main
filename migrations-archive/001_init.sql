-- GIVRwrld Database Schema
-- This migration creates the core tables for the game server hosting platform

-- Map Supabase user to Pterodactyl user
create table if not exists external_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pterodactyl_user_id int,
  panel_username text,
  last_synced_at timestamptz default now()
);

-- Plans sold (Stripe-backed)
create table if not exists plans (
  id text primary key,                 -- 'mc-8gb', 'rust-6gb'
  game text not null,                  -- 'minecraft'|'rust'|'palworld'
  ram_gb int not null,
  vcores int not null,
  ssd_gb int not null,
  stripe_price_id text not null,
  created_at timestamptz default now()
);

-- Registered Pterodactyl nodes for capacity-aware scheduling
create table if not exists ptero_nodes (
  id serial primary key,
  pterodactyl_node_id int not null,     -- from Panel
  name text not null,
  region text not null,                  -- 'east'|'west'|'eu', etc.
  max_ram_gb int not null,
  max_disk_gb int not null,
  reserved_headroom_gb int default 2,
  enabled boolean default true,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Orders/subscriptions
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references plans(id),
  stripe_sub_id text,
  status text not null default 'pending',   -- pending|paid|provisioning|provisioned|error|canceled
  region text not null default 'east',
  pterodactyl_server_id int,
  pterodactyl_server_identifier text,
  node_id int references ptero_nodes(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Server stats cache (optional, for performance)
create table if not exists server_stats_cache (
  order_id uuid primary key references orders(id) on delete cascade,
  state text not null,                   -- 'running'|'stopped'|'starting'|'stopping'
  cpu_percent real,
  memory_bytes bigint,
  disk_bytes bigint,
  uptime_ms bigint,
  last_updated timestamptz default now()
);

-- RLS Policies
alter table external_accounts enable row level security;
alter table orders enable row level security;
alter table server_stats_cache enable row level security;

-- External accounts policies
create policy "own external select" on external_accounts for select using (auth.uid() = user_id);
create policy "own external upsert" on external_accounts for insert with check (auth.uid() = user_id);
create policy "own external update" on external_accounts for update using (auth.uid() = user_id);

-- Orders policies
create policy "own orders select" on orders for select using (auth.uid() = user_id);
create policy "own orders insert" on orders for insert with check (auth.uid() = user_id);

-- Server stats policies
create policy "own stats select" on server_stats_cache for select using (
  exists (
    select 1 from orders 
    where orders.id = server_stats_cache.order_id 
    and orders.user_id = auth.uid()
  )
);

-- Indexes for performance
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_plan_id on orders(plan_id);
create index if not exists idx_orders_stripe_sub_id on orders(stripe_sub_id);
create index if not exists idx_ptero_nodes_region on ptero_nodes(region);
create index if not exists idx_ptero_nodes_enabled on ptero_nodes(enabled);
create index if not exists idx_plans_game on plans(game);

-- Insert default plans (update with your actual Stripe price IDs)
insert into plans (id, game, ram_gb, vcores, ssd_gb, stripe_price_id) values
  ('mc-4gb', 'minecraft', 4, 2, 20, 'price_minecraft_4gb'),
  ('mc-8gb', 'minecraft', 8, 4, 40, 'price_minecraft_8gb'),
  ('rust-6gb', 'rust', 6, 3, 30, 'price_rust_6gb'),
  ('rust-12gb', 'rust', 12, 6, 60, 'price_rust_12gb'),
  ('palworld-8gb', 'palworld', 8, 4, 40, 'price_palworld_8gb'),
  ('palworld-16gb', 'palworld', 16, 8, 80, 'price_palworld_16gb')
on conflict (id) do nothing;

-- Insert default nodes (update with your actual Pterodactyl node IDs)
insert into ptero_nodes (pterodactyl_node_id, name, region, max_ram_gb, max_disk_gb) values
  (1, 'US-East-1', 'east', 64, 1000),
  (2, 'US-West-1', 'west', 64, 1000),
  (3, 'EU-Central-1', 'eu', 64, 1000)
on conflict (pterodactyl_node_id) do nothing;


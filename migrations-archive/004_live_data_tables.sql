-- User servers table for live server data
create table if not exists public.user_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  game_type text not null,
  status text not null default 'offline',
  current_players integer default 0,
  max_players integer default 20,
  uptime text default '99.9%',
  pterodactyl_url text,
  pterodactyl_server_id text,
  ram integer default 4,
  cpu_cores integer default 2,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User billing table for live billing data
create table if not exists public.user_billing (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount decimal(10,2) not null,
  currency text default 'USD',
  status text not null default 'pending',
  description text,
  payment_method text,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_servers enable row level security;
alter table public.user_billing enable row level security;

-- Policies for user_servers
create policy "user_servers_read_own" on public.user_servers
  for select using (auth.uid() = user_id);

create policy "user_servers_insert_own" on public.user_servers
  for insert with check (auth.uid() = user_id);

create policy "user_servers_update_own" on public.user_servers
  for update using (auth.uid() = user_id);

create policy "user_servers_delete_own" on public.user_servers
  for delete using (auth.uid() = user_id);

-- Policies for user_billing
create policy "user_billing_read_own" on public.user_billing
  for select using (auth.uid() = user_id);

create policy "user_billing_insert_own" on public.user_billing
  for insert with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_user_servers_user_id on public.user_servers(user_id);
create index if not exists idx_user_servers_status on public.user_servers(status);
create index if not exists idx_user_billing_user_id on public.user_billing(user_id);
create index if not exists idx_user_billing_status on public.user_billing(status);

-- Function to update server last_seen timestamp
create or replace function public.update_server_last_seen(server_uuid uuid)
returns void as $$
begin
  update public.user_servers 
  set last_seen = now(), updated_at = now()
  where id = server_uuid;
end;
$$ language plpgsql security definer;

-- Function to get user's live server stats
create or replace function public.get_user_server_stats(user_uuid uuid)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_servers', count(*),
    'online_servers', count(case when status = 'online' then 1 end),
    'total_players', coalesce(sum(current_players), 0),
    'average_uptime', coalesce(avg(cast(replace(uptime, '%', '') as numeric)), 99.9),
    'servers', jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'game_type', game_type,
        'status', status,
        'current_players', current_players,
        'max_players', max_players,
        'uptime', uptime,
        'pterodactyl_url', pterodactyl_url,
        'last_seen', last_seen
      )
    )
  ) into result
  from public.user_servers
  where user_id = user_uuid;
  
  return coalesce(result, '{"total_servers": 0, "online_servers": 0, "total_players": 0, "average_uptime": 99.9, "servers": []}'::jsonb);
end;
$$ language plpgsql security definer;

-- Function to get user's billing summary
create or replace function public.get_user_billing_summary(user_uuid uuid)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_revenue', coalesce(sum(case when status = 'succeeded' then amount else 0 end), 0),
    'monthly_revenue', coalesce(sum(case when status = 'succeeded' and created_at > now() - interval '30 days' then amount else 0 end), 0),
    'active_subscriptions', count(case when status = 'succeeded' then 1 end),
    'recent_payments', jsonb_agg(
      jsonb_build_object(
        'id', id,
        'amount', amount,
        'currency', currency,
        'status', status,
        'description', description,
        'created_at', created_at
      ) order by created_at desc
    )
  ) into result
  from public.user_billing
  where user_id = user_uuid;
  
  return coalesce(result, '{"total_revenue": 0, "monthly_revenue": 0, "active_subscriptions": 0, "recent_payments": []}'::jsonb);
end;
$$ language plpgsql security definer;

-- Analytics events table for tracking user actions
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  properties jsonb default '{}',
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.analytics_events enable row level security;

-- Policies: users can only see their own events, admins can see all
create policy "analytics_events_read_own" on public.analytics_events
  for select using (auth.uid() = user_id);

create policy "analytics_events_read_admin" on public.analytics_events
  for select using (
    exists (
      select 1 from auth.users 
      where auth.users.id = auth.uid() 
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Index for performance
create index if not exists idx_analytics_events_user_id on public.analytics_events(user_id);
create index if not exists idx_analytics_events_event_type on public.analytics_events(event_type);
create index if not exists idx_analytics_events_timestamp on public.analytics_events(timestamp);

-- Function to get user analytics summary
create or replace function public.get_user_analytics_summary(user_uuid uuid)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_events', count(*),
    'registration_date', min(case when event_type = 'user_registration' then timestamp end),
    'last_login', max(case when event_type = 'user_login' then timestamp end),
    'server_purchases', count(case when event_type = 'server_purchase' then 1 end),
    'game_panel_accesses', count(case when event_type = 'game_panel_access' then 1 end),
    'support_tickets', count(case when event_type = 'support_ticket' then 1 end),
    'affiliate_joins', count(case when event_type = 'affiliate_join' then 1 end)
  ) into result
  from public.analytics_events
  where user_id = user_uuid;
  
  return coalesce(result, '{}'::jsonb);
end;
$$ language plpgsql security definer;

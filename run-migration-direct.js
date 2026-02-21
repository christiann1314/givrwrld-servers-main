import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjhvkvnshnbnxojnandf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHZrdm5zaG5ibnhvam5hbmRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxNTQxOSwiZXhwIjoyMDY5MzkxNDE5fQ.pIsGLXM0vcAXCMdm9DiHjuaGFHU-wUEzht9RUYXYbsY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAnalyticsTable() {
  console.log('Creating analytics_events table...');
  
  try {
    // Create the table
    const { error: tableError } = await supabase
      .from('analytics_events')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('Table does not exist, creating...');
      
      // We'll need to use the Supabase dashboard for this
      console.log('Please run this SQL in your Supabase dashboard:');
      console.log(`
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
      `);
    } else {
      console.log('✓ Analytics table already exists');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createAnalyticsTable();

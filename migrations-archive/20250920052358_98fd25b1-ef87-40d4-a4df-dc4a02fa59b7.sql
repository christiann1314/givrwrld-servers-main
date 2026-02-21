-- Create external_accounts table for mapping Supabase users to Pterodactyl users
CREATE TABLE external_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pterodactyl_user_id int,
  panel_username text,
  last_synced_at timestamptz DEFAULT now()
);

-- Enable RLS: users can only see their own mapping
ALTER TABLE external_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own row read" ON external_accounts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own row upsert" ON external_accounts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own row update" ON external_accounts
FOR UPDATE USING (auth.uid() = user_id);
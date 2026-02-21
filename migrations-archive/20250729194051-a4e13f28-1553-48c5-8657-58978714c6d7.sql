-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user servers table
CREATE TABLE public.user_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  ram TEXT NOT NULL,
  cpu TEXT NOT NULL,
  disk TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning',
  ip TEXT,
  port TEXT,
  pterodactyl_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user stats table
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  active_servers INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  support_tickets INTEGER DEFAULT 0,
  referrals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create purchases table to track billing history
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_servers
CREATE POLICY "Users can view own servers" ON public.user_servers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own servers" ON public.user_servers
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_stats
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for purchases
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert your current purchase data
INSERT INTO public.profiles (user_id, email, display_name)
VALUES ('f9352a56-af91-46e3-af25-d4e463a4bdc1', 'christiann1314@gmail.com', 'Christian')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_stats (user_id, active_servers, total_spent)
VALUES ('f9352a56-af91-46e3-af25-d4e463a4bdc1', 1, 3.50)
ON CONFLICT (user_id) DO UPDATE SET
  active_servers = 1,
  total_spent = 3.50;

INSERT INTO public.user_servers (user_id, server_name, game_type, ram, cpu, disk, location, status, pterodactyl_url)
VALUES ('f9352a56-af91-46e3-af25-d4e463a4bdc1', 'Minecraft Server', 'Minecraft', '1GB', '0.5 vCPU', '10GB', 'US East', 'Online', 'https://panel.givrwrldservers.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.purchases (user_id, plan_name, amount)
VALUES ('f9352a56-af91-46e3-af25-d4e463a4bdc1', 'Minecraft - 1GB', 3.50)
ON CONFLICT DO NOTHING;
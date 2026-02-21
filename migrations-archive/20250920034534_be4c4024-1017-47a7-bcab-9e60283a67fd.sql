-- Create user roles system for 2FA admin management
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to check 2FA status for admins
CREATE OR REPLACE FUNCTION public.admin_requires_2fa()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN public.is_admin(auth.uid()) THEN 
      -- Check if user has 2FA enabled (requires Supabase auth metadata)
      (auth.jwt() ->> 'amr')::jsonb ? 'totp'
    ELSE 
      true -- Non-admins don't need 2FA check
  END
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create 2FA enforcement table
CREATE TABLE public.admin_2fa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enforce_2fa BOOLEAN DEFAULT true,
    grace_period_hours INTEGER DEFAULT 24,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on 2FA settings
ALTER TABLE public.admin_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Insert default 2FA enforcement settings
INSERT INTO public.admin_2fa_settings (enforce_2fa, grace_period_hours)
VALUES (true, 24);

-- RLS policy for 2FA settings (only admins can modify)
CREATE POLICY "Admins can manage 2FA settings"
ON public.admin_2fa_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_2fa_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_admin_2fa_settings_timestamp
BEFORE UPDATE ON public.admin_2fa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_2fa_settings_timestamp();
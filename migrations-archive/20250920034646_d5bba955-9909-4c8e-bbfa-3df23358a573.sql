-- Fix security definer functions by ensuring proper search path
-- These are intentionally SECURITY DEFINER to prevent RLS recursion

-- Update has_role function with proper search path
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update is_admin function with proper search path
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Update admin_requires_2fa function with proper search path
CREATE OR REPLACE FUNCTION public.admin_requires_2fa()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE 
    WHEN public.is_admin(auth.uid()) THEN 
      -- Check if user has 2FA enabled
      (auth.jwt() ->> 'amr')::jsonb ? 'totp'
    ELSE 
      true -- Non-admins don't need 2FA check
  END
$$;

-- Update trigger function with proper search path
CREATE OR REPLACE FUNCTION public.update_2fa_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;
-- Final Security Definer Resolution
-- Minimize SECURITY DEFINER usage to absolute minimum

-- Create a more targeted approach for user creation
-- Split the handle_new_user function into smaller, safer pieces

-- First, create a safe function for profile creation that can work without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_user_profile(
  new_user_id UUID,
  new_email TEXT,
  new_display_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Only allow users to create their own profile
  IF new_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create profile for other users';
  END IF;
  
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    new_user_id,
    new_email,
    COALESCE(new_display_name, split_part(new_email, '@', 1))
  )
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create a safe function for user stats creation
CREATE OR REPLACE FUNCTION public.create_user_stats(user_id_param UUID)
RETURNS UUID AS $$
DECLARE
  stats_id UUID;
BEGIN
  -- Only allow users to create their own stats
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create stats for other users';
  END IF;
  
  INSERT INTO public.user_stats (user_id)
  VALUES (user_id_param)
  RETURNING id INTO stats_id;
  
  RETURN stats_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Replace handle_new_user with a minimal SECURITY DEFINER function
-- This is the ONLY function that truly needs elevated privileges
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Minimal SECURITY DEFINER function that only does what's absolutely necessary
  -- Create initial user profile (new users need this to access the system)
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  -- Create initial user stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions for the new safer functions
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_stats(UUID) TO authenticated;

-- Add documentation explaining why SECURITY DEFINER is still needed
COMMENT ON FUNCTION public.handle_new_user() IS 
'MINIMAL SECURITY DEFINER: Required only for initial user setup during signup. New users need profiles created before they can use standard RLS policies.';

-- Create a view to safely expose user data without SECURITY DEFINER
CREATE OR REPLACE VIEW public.safe_user_profiles AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.created_at,
  p.updated_at,
  -- Only show email to the user themselves
  CASE 
    WHEN p.user_id = auth.uid() THEN p.email
    ELSE NULL
  END as email
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

-- Grant access to the safe view
GRANT SELECT ON public.safe_user_profiles TO authenticated;

-- Create safer financial summary without any elevated privileges
CREATE OR REPLACE VIEW public.my_financial_overview AS
SELECT 
  COUNT(*) as total_orders,
  COALESCE(SUM(amount), 0) as total_spent,
  COALESCE(AVG(amount), 0) as avg_order_value,
  MAX(created_at) as last_purchase_date
FROM public.orders 
WHERE user_id = auth.uid() 
  AND status = 'completed'
  AND auth.uid() IS NOT NULL;

-- Grant access to financial overview
GRANT SELECT ON public.my_financial_overview TO authenticated;

-- Ensure all other functions are without SECURITY DEFINER
-- Double-check by recreating key functions explicitly without it
CREATE OR REPLACE FUNCTION public.log_user_action(
  action_name TEXT,
  details JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'user_action', action_name, NOW());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Grant permission for logging
GRANT EXECUTE ON FUNCTION public.log_user_action(TEXT, JSONB) TO authenticated;
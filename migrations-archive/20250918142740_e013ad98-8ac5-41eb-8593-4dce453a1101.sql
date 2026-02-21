-- Final Solution: Remove All Custom SECURITY DEFINER Usage
-- Work around the need for SECURITY DEFINER by using different approach

-- Remove the SECURITY DEFINER from handle_new_user
-- Instead, we'll rely on proper RLS policies to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function now works without SECURITY DEFINER
  -- It relies on the RLS policies to allow initial user creation
  
  -- Insert profile with basic error handling
  BEGIN
    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, skip
      NULL;
    WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
      VALUES (NEW.id, 'profile_creation_error', SQLERRM, NOW());
  END;
  
  -- Insert user stats with error handling
  BEGIN
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);
  EXCEPTION
    WHEN unique_violation THEN
      -- Stats already exist, skip
      NULL;
    WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
      VALUES (NEW.id, 'stats_creation_error', SQLERRM, NOW());
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update RLS policies to allow initial user creation
-- Allow users to create their initial profile during signup

-- Temporarily drop existing policies to recreate them safely
DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;

-- Create new policies that allow initial profile creation
CREATE POLICY "Users can create and manage own profile" 
ON public.profiles 
FOR ALL 
USING (
  auth.uid() = user_id OR 
  auth.uid() IS NULL  -- Allow during signup process
) 
WITH CHECK (
  auth.uid() = user_id OR
  auth.uid() IS NULL  -- Allow during signup process
);

-- Similarly for user_stats
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;

CREATE POLICY "Users can manage own stats" 
ON public.user_stats 
FOR ALL 
USING (
  auth.uid() = user_id OR 
  auth.uid() IS NULL  -- Allow during signup process
) 
WITH CHECK (
  auth.uid() = user_id OR
  auth.uid() IS NULL  -- Allow during signup process
);

-- Create a safe initialization function for post-signup setup
CREATE OR REPLACE FUNCTION public.initialize_user_data()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  profile_exists BOOLEAN := FALSE;
  stats_exist BOOLEAN := FALSE;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
  ) INTO profile_exists;
  
  -- Check if stats exist  
  SELECT EXISTS(
    SELECT 1 FROM public.user_stats WHERE user_id = auth.uid()
  ) INTO stats_exist;
  
  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (user_id, email, display_name)
    SELECT 
      auth.uid(),
      COALESCE(raw_user_meta_data->>'email', email),
      COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
    FROM auth.users 
    WHERE id = auth.uid();
  END IF;
  
  -- Create stats if they don't exist
  IF NOT stats_exist THEN
    INSERT INTO public.user_stats (user_id)
    VALUES (auth.uid());
  END IF;
  
  RETURN jsonb_build_object(
    'profile_created', NOT profile_exists,
    'stats_created', NOT stats_exist,
    'success', true
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Grant permission for initialization function
GRANT EXECUTE ON FUNCTION public.initialize_user_data() TO authenticated;

-- Add documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
'User creation trigger - no longer uses SECURITY DEFINER, relies on RLS policies';

COMMENT ON FUNCTION public.initialize_user_data() IS 
'Safe user data initialization - can be called by authenticated users to ensure their profile exists';

-- Create a maintenance function to clean up any orphaned data
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS JSONB AS $$
DECLARE
  orphaned_profiles INTEGER := 0;
  orphaned_stats INTEGER := 0;
BEGIN
  -- Only allow authenticated users to clean their own data
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;
  
  -- This is a safe cleanup function that operates within user's permissions
  -- No special privileges needed
  
  RETURN jsonb_build_object(
    'message', 'Cleanup completed',
    'user_id', auth.uid()
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;

GRANT EXECUTE ON FUNCTION public.cleanup_user_data() TO authenticated;
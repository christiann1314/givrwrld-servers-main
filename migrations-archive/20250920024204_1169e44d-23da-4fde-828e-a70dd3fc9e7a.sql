-- Create a function to manually create missing profiles and link Pterodactyl accounts
CREATE OR REPLACE FUNCTION public.create_missing_profile_with_pterodactyl(
  user_id_param UUID,
  email_param TEXT,
  display_name_param TEXT DEFAULT NULL,
  pterodactyl_user_id_param INTEGER DEFAULT NULL,
  pterodactyl_password_param TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  profile_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Only allow users to create their own profile
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create profile for other users';
  END IF;
  
  -- Encrypt password if provided
  IF pterodactyl_password_param IS NOT NULL THEN
    encrypted_password := public.encrypt_sensitive_data(pterodactyl_password_param);
  END IF;
  
  -- Insert or update profile
  INSERT INTO public.profiles (
    user_id, 
    email, 
    display_name, 
    pterodactyl_user_id, 
    pterodactyl_password_encrypted
  )
  VALUES (
    user_id_param,
    email_param,
    COALESCE(display_name_param, split_part(email_param, '@', 1)),
    pterodactyl_user_id_param,
    encrypted_password
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    pterodactyl_user_id = COALESCE(EXCLUDED.pterodactyl_user_id, profiles.pterodactyl_user_id),
    pterodactyl_password_encrypted = COALESCE(EXCLUDED.pterodactyl_password_encrypted, profiles.pterodactyl_password_encrypted),
    updated_at = now()
  RETURNING id INTO profile_id;
  
  -- Log the action
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'profile_manual_creation', 'INSERT_OR_UPDATE', NOW());
  
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', profile_id,
    'message', 'Profile created/updated successfully'
  );
END;
$function$;
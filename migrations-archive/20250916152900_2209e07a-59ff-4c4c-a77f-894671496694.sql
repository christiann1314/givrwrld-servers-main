-- Security Enhancement: Handle existing users without encrypted passwords
-- Create function to migrate existing users to encrypted passwords

CREATE OR REPLACE FUNCTION public.migrate_user_passwords()
RETURNS void AS $$
DECLARE
  profile_record RECORD;
  temp_password TEXT;
  encrypted_password TEXT;
BEGIN
  -- Log the migration start
  RAISE NOTICE 'Starting password migration for existing users';
  
  -- Find all profiles without encrypted passwords
  FOR profile_record IN 
    SELECT user_id, email 
    FROM public.profiles 
    WHERE pterodactyl_password_encrypted IS NULL
    AND pterodactyl_user_id IS NOT NULL
  LOOP
    -- Generate a temporary secure password for existing users
    temp_password := encode(gen_random_bytes(16), 'base64');
    
    -- Encrypt the temporary password
    SELECT public.encrypt_sensitive_data(temp_password) INTO encrypted_password;
    
    -- Update the profile with encrypted password
    UPDATE public.profiles 
    SET pterodactyl_password_encrypted = encrypted_password,
        updated_at = now()
    WHERE user_id = profile_record.user_id;
    
    RAISE NOTICE 'Migrated user: %', profile_record.email;
  END LOOP;
  
  RAISE NOTICE 'Password migration completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run the migration for existing users
SELECT public.migrate_user_passwords();

-- Drop the migration function as it's no longer needed
DROP FUNCTION public.migrate_user_passwords();
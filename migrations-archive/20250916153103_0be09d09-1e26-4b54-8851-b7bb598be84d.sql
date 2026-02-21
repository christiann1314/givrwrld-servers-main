-- Security Enhancement: Handle existing users without encrypted passwords
-- Simple migration to ensure all users have encrypted passwords

-- Update profiles that have pterodactyl_user_id but no encrypted password
UPDATE public.profiles 
SET pterodactyl_password_encrypted = public.encrypt_sensitive_data('temp_' || substr(md5(random()::text), 1, 12)),
    updated_at = now()
WHERE pterodactyl_user_id IS NOT NULL 
  AND pterodactyl_password_encrypted IS NULL;
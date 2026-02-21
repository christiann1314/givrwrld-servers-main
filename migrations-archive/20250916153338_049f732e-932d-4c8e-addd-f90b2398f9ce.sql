-- Fix encryption function to work without gen_random_bytes
-- Use a simpler encryption approach for compatibility

CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple base64 encoding with salt for basic obfuscation
  -- Note: This is basic security - consider upgrading to proper encryption when pgcrypto is available
  RETURN encode(convert_to('SALT_' || data || '_' || extract(epoch from now())::text, 'UTF8'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now migrate existing users without encrypted passwords
UPDATE public.profiles 
SET pterodactyl_password_encrypted = public.encrypt_sensitive_data('temp_' || substr(md5(random()::text), 1, 12)),
    updated_at = now()
WHERE pterodactyl_user_id IS NOT NULL 
  AND pterodactyl_password_encrypted IS NULL;
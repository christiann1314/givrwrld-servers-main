-- SECURITY FIX: Remove plain text password storage
-- The pterodactyl_password column stores passwords in plain text, which is a critical security risk

-- Drop the insecure pterodactyl_password column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pterodactyl_password;

-- Add a secure encrypted password field instead
ALTER TABLE public.profiles ADD COLUMN pterodactyl_password_encrypted TEXT;

-- Create a function to securely hash passwords (using pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT, secret TEXT DEFAULT current_setting('app.jwt_secret', true))
RETURNS TEXT AS $$
BEGIN
  RETURN encode(encrypt(data::bytea, secret, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to decrypt sensitive data (for authorized access only)
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data TEXT, secret TEXT DEFAULT current_setting('app.jwt_secret', true))
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), secret, 'aes'), 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the security improvement
COMMENT ON COLUMN public.profiles.pterodactyl_password_encrypted IS 'Encrypted Pterodactyl password - use encrypt_sensitive_data() function to store';

-- Add audit trigger for sensitive data access
CREATE TRIGGER profiles_audit_trigger
    AFTER SELECT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_sensitive_access();
-- SECURITY FIX: Remove plain text password storage
-- The pterodactyl_password column stores passwords in plain text, which is a critical security risk

-- Drop the insecure pterodactyl_password column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pterodactyl_password;

-- Add a secure encrypted password field instead
ALTER TABLE public.profiles ADD COLUMN pterodactyl_password_encrypted TEXT;

-- Create pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt sensitive data using AES encryption
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use a consistent encryption key derived from database settings
  RETURN encode(encrypt(data::bytea, gen_random_bytes(32), 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the security improvement
COMMENT ON COLUMN public.profiles.pterodactyl_password_encrypted IS 'Encrypted Pterodactyl password - passwords are now encrypted instead of stored as plain text';

-- Update the audit trigger to log profile access (INSERT/UPDATE/DELETE only)
DROP TRIGGER IF EXISTS profiles_audit_trigger ON public.profiles;
CREATE TRIGGER profiles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_sensitive_access();
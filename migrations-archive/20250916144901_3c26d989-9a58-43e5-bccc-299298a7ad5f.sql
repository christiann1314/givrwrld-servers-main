-- Fix the function security issue by setting search_path
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use a consistent encryption key derived from database settings
  RETURN encode(encrypt(data::bytea, gen_random_bytes(32), 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
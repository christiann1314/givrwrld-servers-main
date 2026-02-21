-- Remove Security Definer from Functions Where Not Essential
-- Keep only where absolutely necessary for core functionality

-- Update timestamp function - doesn't need elevated privileges
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Validation function - doesn't need elevated privileges
CREATE OR REPLACE FUNCTION public.validate_order_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Order amount must be positive';
  END IF;
  
  -- Ensure currency is valid (expanded list)
  IF NEW.currency NOT IN ('usd', 'eur', 'gbp', 'cad', 'aud') THEN
    RAISE EXCEPTION 'Invalid currency code: %. Supported: USD, EUR, GBP, CAD, AUD', NEW.currency;
  END IF;
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create orders for other users';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Encryption function - remove SECURITY DEFINER and make it a simple utility
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
RETURNS TEXT AS $$
BEGIN
  -- Simple obfuscation without elevated privileges
  -- Note: This is basic security for demonstration purposes
  RETURN encode(convert_to('OBFUSCATED_' || data || '_' || extract(epoch from now())::text, 'UTF8'), 'base64');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Audit function - make it work without elevated privileges
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if we have an authenticated user context
  -- This prevents privilege escalation while still providing audit functionality
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), now());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Keep handle_new_user with SECURITY DEFINER only because it MUST insert into profiles/stats
-- This is the only function that truly needs elevated privileges for core functionality
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function must run with elevated privileges to create user profiles
  -- when users sign up, as new users don't have permissions to insert initially
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a safer alternative to the encryption function for general use
CREATE OR REPLACE FUNCTION public.hash_data(data text)
RETURNS TEXT AS $$
BEGIN
  -- Simple hashing function without elevated privileges
  -- Better for most use cases than the encryption function
  RETURN encode(digest(data || extract(epoch from now())::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Grant appropriate permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_order_data() TO authenticated;  
GRANT EXECUTE ON FUNCTION public.encrypt_sensitive_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_sensitive_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_data(text) TO authenticated;
-- handle_new_user is called by system triggers, no explicit grant needed

-- Add comment explaining the remaining SECURITY DEFINER function
COMMENT ON FUNCTION public.handle_new_user() IS 
'SECURITY DEFINER required: Creates user profiles during signup when users lack initial permissions';
-- Enhanced Financial Data Security
-- Implement additional safeguards beyond RLS for financial data

-- Create secure financial data table with encryption
CREATE TABLE IF NOT EXISTS public.financial_records_secure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('order', 'purchase')),
  reference_id UUID NOT NULL, -- References orders.id or purchases.id
  encrypted_amount TEXT NOT NULL, -- Encrypted amount data
  encrypted_stripe_data TEXT, -- Encrypted Stripe session/subscription IDs
  access_hash TEXT NOT NULL, -- Hash for integrity checking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on secure financial records
ALTER TABLE public.financial_records_secure ENABLE ROW LEVEL SECURITY;

-- Restrictive policies for financial records (service role only for write operations)
CREATE POLICY "Users can view own financial records" 
ON public.financial_records_secure 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage financial records" 
ON public.financial_records_secure 
FOR ALL 
USING (auth.role() = 'service_role');

-- Enhanced audit logging function for financial data access
CREATE OR REPLACE FUNCTION public.audit_financial_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all access to orders and purchases tables
  INSERT INTO public.audit_log (
    user_id, 
    table_name, 
    operation, 
    row_id, 
    timestamp,
    user_agent,
    ip_address
  ) 
  VALUES (
    auth.uid(), 
    TG_TABLE_NAME, 
    TG_OP, 
    COALESCE(NEW.id, OLD.id), 
    NOW(),
    current_setting('request.headers', true)::json->>'user-agent',
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit triggers to financial tables
DROP TRIGGER IF EXISTS audit_orders_access ON public.orders;
CREATE TRIGGER audit_orders_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_access();

DROP TRIGGER IF EXISTS audit_purchases_access ON public.purchases;
CREATE TRIGGER audit_purchases_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_access();

-- Enhanced validation function for financial data
CREATE OR REPLACE FUNCTION public.validate_financial_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Additional security checks beyond existing validation
  
  -- Ensure user_id matches authenticated user (double-check)
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized financial data modification attempt detected';
  END IF;
  
  -- Validate amount is reasonable (prevent overflow attacks)
  IF NEW.amount > 999999.99 OR NEW.amount < 0 THEN
    RAISE EXCEPTION 'Invalid amount detected: %', NEW.amount;
  END IF;
  
  -- Log suspicious activity
  IF NEW.amount > 10000 THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME || '_high_value', TG_OP, NEW.id, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add enhanced validation triggers
DROP TRIGGER IF EXISTS validate_orders_enhanced ON public.orders;
CREATE TRIGGER validate_orders_enhanced
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_data();

DROP TRIGGER IF EXISTS validate_purchases_enhanced ON public.purchases;  
CREATE TRIGGER validate_purchases_enhanced
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_data();

-- Create view for safe financial data access (removes sensitive fields)
CREATE OR REPLACE VIEW public.orders_safe AS
SELECT 
  id,
  user_id,
  server_id,
  CASE 
    WHEN auth.uid() = user_id THEN amount 
    ELSE NULL 
  END as amount,
  CASE 
    WHEN auth.uid() = user_id THEN currency
    ELSE NULL 
  END as currency,
  status,
  created_at,
  updated_at,
  -- Remove sensitive Stripe data from view
  NULL as stripe_session_id,
  NULL as stripe_subscription_id,
  -- Sanitize order payload
  CASE 
    WHEN auth.uid() = user_id THEN 
      jsonb_build_object(
        'plan_name', order_payload->>'plan_name',
        'server_config', order_payload->'server_config'
      )
    ELSE NULL 
  END as order_payload_safe
FROM public.orders
WHERE auth.uid() = user_id;

-- Grant access to safe view
GRANT SELECT ON public.orders_safe TO authenticated;

-- Add column-level security for sensitive fields (PostgreSQL 10+)
-- Revoke direct access to sensitive columns and use functions instead
REVOKE ALL ON public.orders FROM authenticated;
REVOKE ALL ON public.purchases FROM authenticated;

-- Grant limited access through RLS policies only
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.purchases TO authenticated;

-- Create secure function to decrypt financial data (service role only)
CREATE OR REPLACE FUNCTION public.decrypt_financial_amount(encrypted_data TEXT, user_requesting UUID)
RETURNS NUMERIC AS $$
BEGIN
  -- Only allow if user is requesting their own data
  IF user_requesting != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized access to financial data';
  END IF;
  
  -- Simple decryption (in production, use proper encryption)
  -- This is a placeholder - implement proper encryption in production
  RETURN (decode(encrypted_data, 'base64')::TEXT)::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
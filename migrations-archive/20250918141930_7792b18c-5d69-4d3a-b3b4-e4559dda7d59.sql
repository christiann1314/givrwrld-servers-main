-- Enhanced Financial Data Security (Corrected)
-- Implement additional safeguards beyond RLS for financial data

-- Create secure financial audit table
CREATE TABLE IF NOT EXISTS public.financial_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  row_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on financial audit
ALTER TABLE public.financial_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit data
CREATE POLICY "Service role can manage financial audit" 
ON public.financial_audit 
FOR ALL 
USING (auth.role() = 'service_role');

-- Enhanced audit logging function for financial data (INSERT/UPDATE/DELETE only)
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log changes to orders and purchases tables
  INSERT INTO public.financial_audit (
    user_id,
    table_name,
    operation,
    row_id,
    old_values,
    new_values,
    ip_address,
    timestamp
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
    inet_client_addr(),
    NOW()
  );
  
  -- Also log to existing audit_log for compatibility
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    operation,
    row_id,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit triggers for financial table changes only
DROP TRIGGER IF EXISTS audit_orders_changes ON public.orders;
CREATE TRIGGER audit_orders_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

DROP TRIGGER IF EXISTS audit_purchases_changes ON public.purchases;
CREATE TRIGGER audit_purchases_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

-- Enhanced validation function with security checks
CREATE OR REPLACE FUNCTION public.validate_financial_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user_id matches authenticated user (prevent privilege escalation)
  IF NEW.user_id != auth.uid() THEN
    -- Log security violation
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME || '_security_violation', TG_OP, NEW.id, NOW());
    
    RAISE EXCEPTION 'Security violation: Unauthorized financial data modification attempted';
  END IF;
  
  -- Validate amount ranges (prevent overflow and negative attacks)
  IF TG_TABLE_NAME = 'orders' OR TG_TABLE_NAME = 'purchases' THEN
    IF NEW.amount > 999999.99 OR NEW.amount < 0 THEN
      RAISE EXCEPTION 'Invalid amount detected: %. Must be between 0 and 999999.99', NEW.amount;
    END IF;
  END IF;
  
  -- Log high-value transactions for review
  IF NEW.amount > 1000 THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME || '_high_value', TG_OP, NEW.id, NOW());
  END IF;
  
  -- Validate currency codes
  IF TG_TABLE_NAME = 'orders' AND NEW.currency NOT IN ('usd', 'eur', 'gbp', 'cad', 'aud') THEN
    RAISE EXCEPTION 'Invalid currency code: %', NEW.currency;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace existing validation triggers with enhanced ones
DROP TRIGGER IF EXISTS validate_orders_enhanced ON public.orders;
CREATE TRIGGER validate_orders_enhanced
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_security();

DROP TRIGGER IF EXISTS validate_purchases_enhanced ON public.purchases;
CREATE TRIGGER validate_purchases_enhanced
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_security();

-- Create secure views that hide sensitive data by default
CREATE OR REPLACE VIEW public.orders_secure AS
SELECT 
  id,
  user_id,
  server_id,
  -- Mask amount for privacy (show only if user owns the record)
  CASE 
    WHEN auth.uid() = user_id THEN amount 
    ELSE NULL 
  END as amount,
  CASE 
    WHEN auth.uid() = user_id THEN currency
    ELSE 'XXX' 
  END as currency,
  status,
  created_at,
  updated_at,
  -- Never expose Stripe IDs in views
  'HIDDEN' as stripe_session_id,
  'HIDDEN' as stripe_subscription_id,
  -- Sanitize order payload to remove sensitive data
  CASE 
    WHEN auth.uid() = user_id THEN 
      jsonb_build_object(
        'plan_name', order_payload->>'plan_name',
        'server_config', jsonb_build_object(
          'ram', (order_payload->'server_config')->>'ram',
          'cpu', (order_payload->'server_config')->>'cpu',
          'location', (order_payload->'server_config')->>'location'
        )
      )
    ELSE jsonb_build_object('access', 'denied')
  END as order_summary
FROM public.orders
WHERE auth.uid() = user_id OR auth.role() = 'service_role';

-- Create secure function for financial data access (with additional logging)
CREATE OR REPLACE FUNCTION public.get_user_financial_summary(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_orders BIGINT,
  total_spent NUMERIC,
  avg_order_value NUMERIC,
  last_purchase_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  requesting_user UUID;
BEGIN
  requesting_user := COALESCE(target_user_id, auth.uid());
  
  -- Security check: users can only access their own data
  IF requesting_user != auth.uid() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to financial data';
  END IF;
  
  -- Log the access for audit
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'financial_summary_access', 'SELECT', NOW());
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(o.amount), 0),
    COALESCE(AVG(o.amount), 0),
    MAX(o.created_at)
  FROM public.orders o
  WHERE o.user_id = requesting_user AND o.status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add rate limiting for financial operations
CREATE TABLE IF NOT EXISTS public.financial_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  operation_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rate limits
ALTER TABLE public.financial_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage rate limits
CREATE POLICY "Service role manages rate limits" 
ON public.financial_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role');

-- Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_financial_rate_limit(operation TEXT, max_operations INTEGER DEFAULT 10, window_minutes INTEGER DEFAULT 60)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count operations in the current window
  SELECT COALESCE(SUM(operation_count), 0)
  INTO current_count
  FROM public.financial_rate_limits
  WHERE user_id = auth.uid() 
    AND operation_type = operation
    AND created_at > window_start;
  
  -- If limit exceeded, reject
  IF current_count >= max_operations THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
    VALUES (auth.uid(), 'rate_limit_violation', operation, NOW());
    
    RETURN FALSE;
  END IF;
  
  -- Record this operation
  INSERT INTO public.financial_rate_limits (user_id, operation_type)
  VALUES (auth.uid(), operation);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
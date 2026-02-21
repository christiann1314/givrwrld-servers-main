-- Final Security Fix - Remove All Security Definer Functions
-- Replace with safer non-privileged functions

-- Drop all functions that had SECURITY DEFINER and recreate without it
DROP FUNCTION IF EXISTS public.get_user_financial_summary(UUID);
DROP FUNCTION IF EXISTS public.check_financial_rate_limit(TEXT, INTEGER, INTEGER);

-- Replace with safer function that doesn't use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_financial_summary()
RETURNS TABLE(
  total_orders BIGINT,
  total_spent NUMERIC,
  avg_order_value NUMERIC,
  last_purchase_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Only works for authenticated users, no privilege escalation
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Log the access (this will use the caller's permissions)
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'my_financial_summary', 'SELECT', NOW());
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(o.amount), 0),
    COALESCE(AVG(o.amount), 0),
    MAX(o.created_at)
  FROM public.orders o
  WHERE o.user_id = auth.uid() 
    AND o.status = 'completed';
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Safer rate limiting function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_my_rate_limit(operation_name TEXT, max_ops INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only for authenticated users
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  window_start := NOW() - INTERVAL '60 minutes';
  
  -- Count operations in the current window
  SELECT COALESCE(SUM(operation_count), 0)
  INTO current_count
  FROM public.financial_rate_limits
  WHERE user_id = auth.uid() 
    AND operation_type = operation_name
    AND created_at > window_start;
  
  -- If limit exceeded, log and reject
  IF current_count >= max_ops THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
    VALUES (auth.uid(), 'rate_limit_exceeded', operation_name, NOW());
    
    RETURN FALSE;
  END IF;
  
  -- Record this operation
  INSERT INTO public.financial_rate_limits (user_id, operation_type)
  VALUES (auth.uid(), operation_name);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update audit function to be less privileged
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if we have a valid user context
  IF auth.uid() IS NOT NULL THEN
    -- Log changes to orders and purchases tables
    INSERT INTO public.financial_audit (
      user_id,
      table_name,
      operation,
      row_id,
      old_values,
      new_values,
      timestamp
    ) VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      TG_TABLE_NAME,
      TG_OP,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update validation function to be less privileged
CREATE OR REPLACE FUNCTION public.validate_financial_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    -- Log security violation (only if we have auth context)
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
      VALUES (auth.uid(), TG_TABLE_NAME || '_security_violation', TG_OP, NEW.id, NOW());
    END IF;
    
    RAISE EXCEPTION 'Unauthorized: Cannot modify financial data for other users';
  END IF;
  
  -- Validate amount ranges
  IF TG_TABLE_NAME IN ('orders', 'purchases') THEN
    IF NEW.amount > 999999.99 OR NEW.amount < 0 THEN
      RAISE EXCEPTION 'Invalid amount: %. Must be between $0 and $999,999.99', NEW.amount;
    END IF;
  END IF;
  
  -- Log high-value transactions
  IF NEW.amount > 1000 AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME || '_high_value', TG_OP, NEW.id, NOW());
  END IF;
  
  -- Validate currency codes for orders
  IF TG_TABLE_NAME = 'orders' AND NEW.currency IS NOT NULL THEN
    IF NEW.currency NOT IN ('usd', 'eur', 'gbp', 'cad', 'aud') THEN
      RAISE EXCEPTION 'Invalid currency: %. Supported currencies: USD, EUR, GBP, CAD, AUD', NEW.currency;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_my_financial_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_my_rate_limit(TEXT, INTEGER) TO authenticated;

-- Add a final constraint to ensure financial data integrity
ALTER TABLE public.orders ADD CONSTRAINT orders_amount_positive CHECK (amount >= 0);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_amount_positive CHECK (amount >= 0);

-- Create index for better performance on financial queries
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON public.purchases(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_audit_user_date ON public.financial_audit(user_id, timestamp);
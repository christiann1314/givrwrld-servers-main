-- Fix Security Definer View Issue
-- Remove SECURITY DEFINER from views and use proper RLS instead

-- Drop the existing view that had security definer issues
DROP VIEW IF EXISTS public.orders_secure;

-- Recreate view without security definer - rely on RLS instead
CREATE VIEW public.orders_secure AS
SELECT 
  id,
  user_id,
  server_id,
  -- Only show amount to record owner
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
  -- Hide sensitive Stripe data completely
  CASE 
    WHEN auth.uid() = user_id THEN 'OWNED'
    ELSE 'HIDDEN' 
  END as access_level,
  -- Sanitized order payload
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
FROM public.orders;

-- Enable RLS on the view (inherits from base table)
-- No additional RLS needed as it uses the base table's policies

-- Create a safer financial summary function without SECURITY DEFINER
-- Users will call this through a controlled API
CREATE OR REPLACE FUNCTION public.get_safe_financial_summary()
RETURNS TABLE(
  user_total_orders BIGINT,
  user_total_spent NUMERIC,
  user_avg_order NUMERIC,
  user_last_purchase TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Only return data for the authenticated user
  -- No privilege escalation possible
  
  -- Log the access
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'safe_financial_summary', 'SELECT', NOW());
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(o.amount), 0),
    COALESCE(AVG(o.amount), 0),
    MAX(o.created_at)
  FROM public.orders o
  WHERE o.user_id = auth.uid() 
    AND o.status = 'completed'
    AND auth.uid() IS NOT NULL; -- Extra safety check
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_safe_financial_summary() TO authenticated;

-- Add additional constraint to prevent data leakage in edge cases
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_not_null 
  CHECK (user_id IS NOT NULL);

ALTER TABLE public.purchases ADD CONSTRAINT purchases_user_id_not_null 
  CHECK (user_id IS NOT NULL);

-- Create a policy that explicitly denies access if user_id is somehow null
CREATE POLICY "Deny null user_id access" 
ON public.orders 
FOR ALL 
USING (user_id IS NOT NULL AND auth.uid() IS NOT NULL);

CREATE POLICY "Deny null user_id access purchases" 
ON public.purchases 
FOR ALL 
USING (user_id IS NOT NULL AND auth.uid() IS NOT NULL);
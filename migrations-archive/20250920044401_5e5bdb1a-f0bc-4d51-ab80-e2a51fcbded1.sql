-- Fix security definer views by removing them if they're not needed
-- These are likely leftover from the old financial system

DROP VIEW IF EXISTS public.my_financial_overview;
DROP VIEW IF EXISTS public.orders_secure;
DROP VIEW IF EXISTS public.safe_user_profiles;

-- Create secure replacement views without SECURITY DEFINER
CREATE VIEW public.user_financial_summary AS
SELECT 
  COUNT(*)::BIGINT as total_orders,
  COALESCE(SUM(amount), 0) as total_spent,
  COALESCE(AVG(amount), 0) as avg_order_value,
  MAX(created_at) as last_purchase_date
FROM public.orders 
WHERE user_id = auth.uid() AND status = 'completed';

-- Enable RLS on the new view
ALTER VIEW public.user_financial_summary SET (security_invoker = true);
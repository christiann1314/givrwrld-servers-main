-- Fix critical RLS policy vulnerabilities

-- Drop and recreate orders table policies with proper security
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;

-- Create secure policies for orders table
CREATE POLICY "Users can insert own orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Ensure user_id column is not nullable for security
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

-- Add audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to purchases and orders
  INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
  VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), now());
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  table_name text NOT NULL,
  operation text NOT NULL,
  row_id uuid,
  timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (for now, can be expanded later)
CREATE POLICY "Service role can manage audit logs" 
ON public.audit_log 
FOR ALL 
TO service_role;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

CREATE TRIGGER audit_purchases_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

-- Add data validation function
CREATE OR REPLACE FUNCTION public.validate_order_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Order amount must be positive';
  END IF;
  
  -- Ensure currency is valid
  IF NEW.currency NOT IN ('usd', 'eur', 'gbp') THEN
    RAISE EXCEPTION 'Invalid currency code';
  END IF;
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create orders for other users';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add validation trigger
CREATE TRIGGER validate_orders_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_data();
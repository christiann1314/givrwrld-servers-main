-- Fix function search path security warnings
ALTER FUNCTION public.audit_sensitive_access() SET search_path = public;
ALTER FUNCTION public.validate_order_data() SET search_path = public;
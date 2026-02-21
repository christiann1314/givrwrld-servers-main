-- Fix security warnings by updating function search paths
CREATE OR REPLACE FUNCTION public.calculate_next_audit_run(frequency_param TEXT)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE frequency_param
    WHEN 'daily' THEN
      RETURN NOW() + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN NOW() + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN NOW() + INTERVAL '1 month';
    ELSE
      RETURN NOW() + INTERVAL '1 week';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_audit_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.frequency != OLD.frequency OR NEW.last_run != OLD.last_run THEN
    NEW.next_run = public.calculate_next_audit_run(NEW.frequency);
  END IF;
  RETURN NEW;
END;
$$;
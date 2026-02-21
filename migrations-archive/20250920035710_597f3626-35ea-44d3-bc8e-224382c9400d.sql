-- Create security audit tables
CREATE TABLE public.security_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('dependency_scan', 'rls_check', 'access_audit', 'comprehensive')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  findings JSONB DEFAULT '[]'::jsonb,
  severity_counts JSONB DEFAULT '{"critical": 0, "high": 0, "medium": 0, "low": 0}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create dependency audit table
CREATE TABLE public.dependency_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_name TEXT NOT NULL,
  current_version TEXT NOT NULL,
  latest_version TEXT,
  has_vulnerabilities BOOLEAN DEFAULT false,
  vulnerability_count INTEGER DEFAULT 0,
  vulnerability_details JSONB DEFAULT '[]'::jsonb,
  update_recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  audit_id UUID REFERENCES public.security_audits(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_audits
CREATE POLICY "Admins can manage security audits"
ON public.security_audits
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view completed audits"
ON public.security_audits
FOR SELECT
TO authenticated
USING (status = 'completed');

-- RLS Policies for dependency_audits  
CREATE POLICY "Admins can manage dependency audits"
ON public.dependency_audits
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view dependency audits"
ON public.dependency_audits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.security_audits sa 
    WHERE sa.id = audit_id AND sa.status = 'completed'
  )
);

-- Create audit schedule table
CREATE TABLE public.audit_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('dependency_scan', 'rls_check', 'access_audit', 'comprehensive')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policy for audit_schedule
CREATE POLICY "Admins can manage audit schedule"
ON public.audit_schedule
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create function to calculate next run time
CREATE OR REPLACE FUNCTION public.calculate_next_audit_run(frequency_param TEXT)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
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

-- Insert default audit schedules
INSERT INTO public.audit_schedule (audit_type, frequency, next_run) VALUES
('dependency_scan', 'weekly', public.calculate_next_audit_run('weekly')),
('rls_check', 'monthly', public.calculate_next_audit_run('monthly')),
('comprehensive', 'monthly', public.calculate_next_audit_run('monthly'));

-- Create trigger to update audit schedule
CREATE OR REPLACE FUNCTION public.update_audit_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.frequency != OLD.frequency OR NEW.last_run != OLD.last_run THEN
    NEW.next_run = public.calculate_next_audit_run(NEW.frequency);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_audit_schedule_trigger
  BEFORE UPDATE ON public.audit_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audit_schedule();
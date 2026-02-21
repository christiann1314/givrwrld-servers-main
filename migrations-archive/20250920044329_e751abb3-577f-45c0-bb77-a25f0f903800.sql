-- Create tables for backend functionality

-- Rate limiting tables
CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_limit_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_limit_key TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  identifier TEXT NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  violation_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support system tables
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_staff_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- GDPR compliance tables
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  marketing_emails BOOLEAN DEFAULT false,
  analytics BOOLEAN DEFAULT false,
  cookies BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification system
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backup monitoring
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL,
  backup_size BIGINT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Error logging
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  request_id TEXT,
  user_agent TEXT,
  url TEXT,
  ip_address TEXT,
  severity TEXT NOT NULL DEFAULT 'low',
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test table for backup testing
CREATE TABLE IF NOT EXISTS public.backup_test (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_test ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own support tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own support tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own support messages" ON public.support_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create support messages" ON public.support_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own GDPR requests" ON public.gdpr_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own consents" ON public.user_consents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role manages system tables" ON public.rate_limit_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages violations" ON public.rate_limit_violations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages backups" ON public.backup_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages backup jobs" ON public.backup_jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages error logs" ON public.error_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages backup tests" ON public.backup_test FOR ALL USING (auth.role() = 'service_role');
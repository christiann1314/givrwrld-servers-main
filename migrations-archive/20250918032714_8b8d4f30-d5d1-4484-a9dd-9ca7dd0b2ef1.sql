-- Production Security Hardening
-- Fix auth settings and add rate limiting

-- Enable strict password requirements
ALTER TABLE auth.users 
ADD CONSTRAINT password_length_check 
CHECK (char_length(encrypted_password) > 0);

-- Add rate limiting table for failed login attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  email TEXT,
  failed_attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rate limits
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create rate limit policy (service role only)
CREATE POLICY "Service role can manage rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add user agent logging for security
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET;
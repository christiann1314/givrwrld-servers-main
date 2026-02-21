-- Unblock signup: allow audit logging during auth user creation and from authenticated sessions
BEGIN;

-- Ensure RLS is enabled (safe to run even if already enabled)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Grant minimal privileges required for inserts from auth flow and app users
GRANT INSERT ON public.audit_log TO supabase_auth_admin;
GRANT INSERT ON public.audit_log TO authenticated;

-- Tight RLS: allow only INSERTs (no SELECT/UPDATE/DELETE) for specific roles
DROP POLICY IF EXISTS "Auth admin can insert audit logs" ON public.audit_log;
CREATE POLICY "Auth admin can insert audit logs"
ON public.audit_log
FOR INSERT
TO supabase_auth_admin
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMIT;
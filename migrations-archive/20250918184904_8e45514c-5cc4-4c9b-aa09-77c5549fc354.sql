-- Clean up old server records for fresh start
-- This will remove all existing server records to allow clean provisioning

-- Delete all existing user servers
DELETE FROM public.user_servers;

-- Reset any sequences if needed
-- (No sequences to reset for user_servers table)

-- Add a comment for the cleanup
COMMENT ON TABLE public.user_servers IS 'User servers table - cleaned up for fresh provisioning';
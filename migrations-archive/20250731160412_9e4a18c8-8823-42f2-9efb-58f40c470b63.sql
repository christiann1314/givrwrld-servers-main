-- Ensure full row data is captured for real-time updates
ALTER TABLE public.user_servers REPLICA IDENTITY FULL;
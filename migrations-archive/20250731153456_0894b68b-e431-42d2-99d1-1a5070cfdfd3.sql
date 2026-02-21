-- Enable real-time updates for user_servers table
ALTER TABLE public.user_servers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_servers;
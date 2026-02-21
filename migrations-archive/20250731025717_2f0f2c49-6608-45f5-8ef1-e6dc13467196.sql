-- Enable realtime for user_servers table
ALTER TABLE public.user_servers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_servers;

-- Enable realtime for user_stats table  
ALTER TABLE public.user_stats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
-- Enable full replica identity for better real-time updates
ALTER TABLE public.user_servers REPLICA IDENTITY FULL;
-- Add Pterodactyl user integration columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN pterodactyl_user_id integer,
ADD COLUMN pterodactyl_password text;

-- Update handle_new_user function to create Pterodactyl users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  -- Create Pterodactyl user asynchronously
  PERFORM pg_notify('create_pterodactyl_user', json_build_object(
    'user_id', NEW.id,
    'email', NEW.email,
    'display_name', COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
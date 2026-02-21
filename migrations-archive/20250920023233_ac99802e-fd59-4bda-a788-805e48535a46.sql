-- Create decrypt function for retrieving Pterodactyl passwords
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple decryption to match the encryption function
  -- Note: This is basic security for demonstration purposes
  DECLARE
    decoded_data text;
    original_data text;
  BEGIN
    -- Decode from base64
    decoded_data := convert_from(decode(encrypted_data, 'base64'), 'UTF8');
    
    -- Extract the original data (remove the 'OBFUSCATED_' prefix and timestamp suffix)
    IF decoded_data LIKE 'OBFUSCATED_%' THEN
      -- Remove the prefix and extract the middle part (before the last underscore and timestamp)
      original_data := substring(decoded_data from 12 for (position('_' in reverse(decoded_data)) - 1));
      -- Clean up by finding the last underscore and removing everything after it
      original_data := reverse(substring(reverse(original_data) from position('_' in reverse(original_data)) + 1));
      
      RETURN original_data;
    ELSE
      RETURN 'Invalid encrypted data format';
    END IF;
  END;
END;
$function$;

-- Create function to get user's Pterodactyl credentials
CREATE OR REPLACE FUNCTION public.get_my_pterodactyl_credentials()
 RETURNS TABLE(email text, password text, pterodactyl_user_id integer, panel_url text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only for authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Log the access for security
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'pterodactyl_credentials', 'SELECT', NOW());
  
  RETURN QUERY
  SELECT 
    p.email,
    CASE 
      WHEN p.pterodactyl_password_encrypted IS NOT NULL 
      THEN public.decrypt_sensitive_data(p.pterodactyl_password_encrypted)
      ELSE 'Password not found'
    END as password,
    p.pterodactyl_user_id,
    'https://panel.givrwrldservers.com' as panel_url
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
END;
$function$;
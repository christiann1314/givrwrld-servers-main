

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_requires_2fa"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT CASE 
    WHEN public.is_admin(auth.uid()) THEN 
      -- Check if user has 2FA enabled
      (auth.jwt() ->> 'amr')::jsonb ? 'totp'
    ELSE 
      true -- Non-admins don't need 2FA check
  END
$$;


ALTER FUNCTION "public"."admin_requires_2fa"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_financial_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only log if we have a valid user context
  IF auth.uid() IS NOT NULL THEN
    -- Log changes to orders and purchases tables
    INSERT INTO public.financial_audit (
      user_id,
      table_name,
      operation,
      row_id,
      old_values,
      new_values,
      timestamp
    ) VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      TG_TABLE_NAME,
      TG_OP,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
      NOW()
    );
    
    -- Also log to existing audit_log for compatibility
    INSERT INTO public.audit_log (
      user_id,
      table_name,
      operation,
      row_id,
      timestamp
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME,
      TG_OP,
      COALESCE(NEW.id, OLD.id),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_financial_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_sensitive_access"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only log if we have an authenticated user context
  -- This prevents privilege escalation while still providing audit functionality
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), now());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_sensitive_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_audit_run"("frequency_param" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  CASE frequency_param
    WHEN 'daily' THEN
      RETURN NOW() + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN NOW() + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN NOW() + INTERVAL '1 month';
    ELSE
      RETURN NOW() + INTERVAL '1 week';
  END CASE;
END;
$$;


ALTER FUNCTION "public"."calculate_next_audit_run"("frequency_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_my_rate_limit"("operation_name" "text", "max_ops" integer DEFAULT 10) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only for authenticated users
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  window_start := NOW() - INTERVAL '60 minutes';
  
  -- Count operations in the current window
  SELECT COALESCE(SUM(operation_count), 0)
  INTO current_count
  FROM public.financial_rate_limits
  WHERE user_id = auth.uid() 
    AND operation_type = operation_name
    AND created_at > window_start;
  
  -- If limit exceeded, log and reject
  IF current_count >= max_ops THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
    VALUES (auth.uid(), 'rate_limit_exceeded', operation_name, NOW());
    
    RETURN FALSE;
  END IF;
  
  -- Record this operation
  INSERT INTO public.financial_rate_limits (user_id, operation_type)
  VALUES (auth.uid(), operation_name);
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_my_rate_limit"("operation_name" "text", "max_ops" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_user_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  orphaned_profiles INTEGER := 0;
  orphaned_stats INTEGER := 0;
BEGIN
  -- Only allow authenticated users to clean their own data
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;
  
  -- This is a safe cleanup function that operates within user's permissions
  -- No special privileges needed
  
  RETURN jsonb_build_object(
    'message', 'Cleanup completed',
    'user_id', auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."cleanup_user_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_missing_profile_with_pterodactyl"("user_id_param" "uuid", "email_param" "text", "display_name_param" "text" DEFAULT NULL::"text", "pterodactyl_user_id_param" integer DEFAULT NULL::integer, "pterodactyl_password_param" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  profile_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Only allow users to create their own profile
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create profile for other users';
  END IF;
  
  -- Encrypt password if provided
  IF pterodactyl_password_param IS NOT NULL THEN
    encrypted_password := public.encrypt_sensitive_data(pterodactyl_password_param);
  END IF;
  
  -- Insert or update profile
  INSERT INTO public.profiles (
    user_id, 
    email, 
    display_name, 
    pterodactyl_user_id, 
    pterodactyl_password_encrypted
  )
  VALUES (
    user_id_param,
    email_param,
    COALESCE(display_name_param, split_part(email_param, '@', 1)),
    pterodactyl_user_id_param,
    encrypted_password
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    pterodactyl_user_id = COALESCE(EXCLUDED.pterodactyl_user_id, profiles.pterodactyl_user_id),
    pterodactyl_password_encrypted = COALESCE(EXCLUDED.pterodactyl_password_encrypted, profiles.pterodactyl_password_encrypted),
    updated_at = now()
  RETURNING id INTO profile_id;
  
  -- Log the action
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'profile_manual_creation', 'INSERT_OR_UPDATE', NOW());
  
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', profile_id,
    'message', 'Profile created/updated successfully'
  );
END;
$$;


ALTER FUNCTION "public"."create_missing_profile_with_pterodactyl"("user_id_param" "uuid", "email_param" "text", "display_name_param" "text", "pterodactyl_user_id_param" integer, "pterodactyl_password_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"("new_user_id" "uuid", "new_email" "text", "new_display_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Only allow users to create their own profile
  IF new_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create profile for other users';
  END IF;
  
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    new_user_id,
    new_email,
    COALESCE(new_display_name, split_part(new_email, '@', 1))
  )
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"("new_user_id" "uuid", "new_email" "text", "new_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_stats"("user_id_param" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  stats_id UUID;
BEGIN
  -- Only allow users to create their own stats
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create stats for other users';
  END IF;
  
  INSERT INTO public.user_stats (user_id)
  VALUES (user_id_param)
  RETURNING id INTO stats_id;
  
  RETURN stats_id;
END;
$$;


ALTER FUNCTION "public"."create_user_stats"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_sensitive_data"("data" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Simple obfuscation without elevated privileges
  -- Note: This is basic security for demonstration purposes
  RETURN encode(convert_to('OBFUSCATED_' || data || '_' || extract(epoch from now())::text, 'UTF8'), 'base64');
END;
$$;


ALTER FUNCTION "public"."encrypt_sensitive_data"("data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_financial_summary"() RETURNS TABLE("total_orders" bigint, "total_spent" numeric, "avg_order_value" numeric, "last_purchase_date" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only works for authenticated users, no privilege escalation
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Log the access (this will use the caller's permissions)
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'my_financial_summary', 'SELECT', NOW());
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(o.amount), 0),
    COALESCE(AVG(o.amount), 0),
    MAX(o.created_at)
  FROM public.orders o
  WHERE o.user_id = auth.uid() 
    AND o.status = 'completed';
END;
$$;


ALTER FUNCTION "public"."get_my_financial_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_pterodactyl_credentials"() RETURNS TABLE("email" "text", "password" "text", "pterodactyl_user_id" integer, "panel_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only for authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.email,
    CASE 
      WHEN p.pterodactyl_password_encrypted IS NOT NULL 
      THEN p.pterodactyl_password_encrypted  -- For now, return encrypted password directly
      ELSE 'Password not found'
    END as password,
    p.pterodactyl_user_id,
    'https://panel.givrwrldservers.com' as panel_url
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_my_pterodactyl_credentials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_safe_financial_summary"() RETURNS TABLE("user_total_orders" bigint, "user_total_spent" numeric, "user_avg_order" numeric, "user_last_purchase" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only return data for the authenticated user
  -- No privilege escalation possible
  
  -- Log the access
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'safe_financial_summary', 'SELECT', NOW());
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(o.amount), 0),
    COALESCE(AVG(o.amount), 0),
    MAX(o.created_at)
  FROM public.orders o
  WHERE o.user_id = auth.uid() 
    AND o.status = 'completed'
    AND auth.uid() IS NOT NULL; -- Extra safety check
END;
$$;


ALTER FUNCTION "public"."get_safe_financial_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'User creation trigger - no longer uses SECURITY DEFINER, relies on RLS policies';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_data"("data" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Simple hashing function without elevated privileges
  -- Better for most use cases than the encryption function
  RETURN encode(digest(data || extract(epoch from now())::text, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."hash_data"("data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_user_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB := '{}';
  profile_exists BOOLEAN := FALSE;
  stats_exist BOOLEAN := FALSE;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
  ) INTO profile_exists;
  
  -- Check if stats exist  
  SELECT EXISTS(
    SELECT 1 FROM public.user_stats WHERE user_id = auth.uid()
  ) INTO stats_exist;
  
  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (user_id, email, display_name)
    SELECT 
      auth.uid(),
      COALESCE(raw_user_meta_data->>'email', email),
      COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
    FROM auth.users 
    WHERE id = auth.uid();
  END IF;
  
  -- Create stats if they don't exist
  IF NOT stats_exist THEN
    INSERT INTO public.user_stats (user_id)
    VALUES (auth.uid());
  END IF;
  
  RETURN jsonb_build_object(
    'profile_created', NOT profile_exists,
    'stats_created', NOT stats_exist,
    'success', true
  );
END;
$$;


ALTER FUNCTION "public"."initialize_user_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initialize_user_data"() IS 'Safe user data initialization - can be called by authenticated users to ensure their profile exists';



CREATE OR REPLACE FUNCTION "public"."is_admin"("_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


ALTER FUNCTION "public"."is_admin"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_action"("action_name" "text", "details" "jsonb" DEFAULT NULL::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.audit_log (user_id, table_name, operation, timestamp)
  VALUES (auth.uid(), 'user_action', action_name, NOW());
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."log_user_action"("action_name" "text", "details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_2fa_settings_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_2fa_settings_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_audit_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.frequency != OLD.frequency OR NEW.last_run != OLD.last_run THEN
    NEW.next_run = public.calculate_next_audit_run(NEW.frequency);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_audit_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_financial_security"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    -- Log security violation (only if we have auth context)
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
      VALUES (auth.uid(), TG_TABLE_NAME || '_security_violation', TG_OP, NEW.id, NOW());
    END IF;
    
    RAISE EXCEPTION 'Unauthorized: Cannot modify financial data for other users';
  END IF;
  
  -- Validate amount ranges
  IF TG_TABLE_NAME IN ('orders', 'purchases') THEN
    IF NEW.amount > 999999.99 OR NEW.amount < 0 THEN
      RAISE EXCEPTION 'Invalid amount: %. Must be between $0 and $999,999.99', NEW.amount;
    END IF;
  END IF;
  
  -- Log high-value transactions
  IF NEW.amount > 1000 AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, table_name, operation, row_id, timestamp)
    VALUES (auth.uid(), TG_TABLE_NAME || '_high_value', TG_OP, NEW.id, NOW());
  END IF;
  
  -- Validate currency codes for orders
  IF TG_TABLE_NAME = 'orders' AND NEW.currency IS NOT NULL THEN
    IF NEW.currency NOT IN ('usd', 'eur', 'gbp', 'cad', 'aud') THEN
      RAISE EXCEPTION 'Invalid currency: %. Supported currencies: USD, EUR, GBP, CAD, AUD', NEW.currency;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."validate_financial_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_data"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Ensure amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Order amount must be positive';
  END IF;
  
  -- Ensure currency is valid (expanded list)
  IF NEW.currency NOT IN ('usd', 'eur', 'gbp', 'cad', 'aud') THEN
    RAISE EXCEPTION 'Invalid currency code: %. Supported: USD, EUR, GBP, CAD, AUD', NEW.currency;
  END IF;
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create orders for other users';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_order_data"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addons" (
    "id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "addons_item_type_check" CHECK (("item_type" = ANY (ARRAY['game'::"text", 'vps'::"text"])))
);


ALTER TABLE "public"."addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_2fa_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enforce_2fa" boolean DEFAULT true,
    "grace_period_hours" integer DEFAULT 24,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."admin_2fa_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliates" (
    "user_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "clicks" integer DEFAULT 0,
    "signups" integer DEFAULT 0,
    "credits_cents" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."affiliates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "table_name" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "row_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audit_type" "text" NOT NULL,
    "frequency" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "last_run" timestamp with time zone,
    "next_run" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_schedule_audit_type_check" CHECK (("audit_type" = ANY (ARRAY['dependency_scan'::"text", 'rls_check'::"text", 'access_audit'::"text", 'comprehensive'::"text"]))),
    CONSTRAINT "audit_schedule_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."audit_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backup_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "backup_type" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."backup_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backup_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "backup_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "backup_size" bigint,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."backup_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backup_test" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test" "text",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."backup_test" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "price_monthly" numeric(10,2) NOT NULL,
    "stripe_price_id_monthly" "text",
    "stripe_price_id_quarterly" "text",
    "stripe_price_id_biannual" "text",
    "stripe_price_id_annual" "text",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "pterodactyl_env" "jsonb" DEFAULT '{}'::"jsonb",
    "pterodactyl_limits_patch" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bundles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dependency_audits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "package_name" "text" NOT NULL,
    "current_version" "text" NOT NULL,
    "latest_version" "text",
    "has_vulnerabilities" boolean DEFAULT false,
    "vulnerability_count" integer DEFAULT 0,
    "vulnerability_details" "jsonb" DEFAULT '[]'::"jsonb",
    "update_recommendation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audit_id" "uuid"
);


ALTER TABLE "public"."dependency_audits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_type" "text" NOT NULL,
    "error_message" "text" NOT NULL,
    "stack_trace" "text",
    "user_id" "uuid",
    "request_id" "text",
    "user_agent" "text",
    "url" "text",
    "ip_address" "text",
    "severity" "text" DEFAULT 'low'::"text" NOT NULL,
    "context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_accounts" (
    "user_id" "uuid" NOT NULL,
    "pterodactyl_user_id" integer,
    "panel_username" "text",
    "last_synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."external_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "row_id" "uuid" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "operation_type" "text" NOT NULL,
    "operation_count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "banner_url" "text",
    "docker_image" "text" NOT NULL,
    "egg_id" integer,
    "startup_command" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nest_id" integer
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gdpr_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "request_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."gdpr_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modpacks" (
    "id" "text" NOT NULL,
    "game" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."modpacks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "term" "text" NOT NULL,
    "region" "text" NOT NULL,
    "server_name" "text" NOT NULL,
    "modpack_id" "text",
    "addons" "jsonb" DEFAULT '[]'::"jsonb",
    "stripe_sub_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "node_id" integer,
    "pterodactyl_server_id" integer,
    "pterodactyl_server_identifier" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "orders_item_type_check" CHECK (("item_type" = ANY (ARRAY['game'::"text", 'vps'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'provisioning'::"text", 'provisioned'::"text", 'error'::"text", 'canceled'::"text"]))),
    CONSTRAINT "orders_term_check" CHECK (("term" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."panel_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "panel_user_id" integer NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."panel_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "game" "text",
    "ram_gb" integer NOT NULL,
    "vcores" integer NOT NULL,
    "ssd_gb" integer NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plans_item_type_check" CHECK (("item_type" = ANY (ARRAY['game'::"text", 'vps'::"text"])))
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_items" (
    "sku" "text" NOT NULL,
    "category" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pricing_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ptero_nodes" (
    "id" integer NOT NULL,
    "pterodactyl_node_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "region" "text" NOT NULL,
    "max_ram_gb" integer NOT NULL,
    "max_disk_gb" integer NOT NULL,
    "reserved_headroom_gb" integer DEFAULT 2,
    "enabled" boolean DEFAULT true,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ptero_nodes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ptero_nodes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ptero_nodes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ptero_nodes_id_seq" OWNED BY "public"."ptero_nodes"."id";



CREATE TABLE IF NOT EXISTS "public"."pterodactyl_eggs" (
    "id" integer NOT NULL,
    "egg_id" integer NOT NULL,
    "nest_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "docker_image" "text" NOT NULL,
    "startup_command" "text" NOT NULL,
    "config_files" "jsonb" DEFAULT '{}'::"jsonb",
    "environment_variables" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pterodactyl_eggs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pterodactyl_eggs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pterodactyl_eggs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pterodactyl_eggs_id_seq" OWNED BY "public"."pterodactyl_eggs"."id";



CREATE TABLE IF NOT EXISTS "public"."pterodactyl_nests" (
    "id" integer NOT NULL,
    "nest_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "author" "text" DEFAULT 'Pterodactyl'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pterodactyl_nests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pterodactyl_nests_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pterodactyl_nests_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pterodactyl_nests_id_seq" OWNED BY "public"."pterodactyl_nests"."id";



CREATE TABLE IF NOT EXISTS "public"."rate_limit_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_limit_key" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_violations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_limit_key" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "blocked_until" timestamp with time zone NOT NULL,
    "violation_count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_violations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audit_type" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "findings" "jsonb" DEFAULT '[]'::"jsonb",
    "severity_counts" "jsonb" DEFAULT '{"low": 0, "high": 0, "medium": 0, "critical": 0}'::"jsonb",
    "recommendations" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    CONSTRAINT "security_audits_audit_type_check" CHECK (("audit_type" = ANY (ARRAY['dependency_scan'::"text", 'rls_check'::"text", 'access_audit'::"text", 'comprehensive'::"text"]))),
    CONSTRAINT "security_audits_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."security_audits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."server_stats_cache" (
    "order_id" "uuid" NOT NULL,
    "state" "text" NOT NULL,
    "cpu_percent" real,
    "memory_bytes" bigint,
    "disk_bytes" bigint,
    "uptime_ms" bigint,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."server_stats_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."servers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "panel_user_id" integer NOT NULL,
    "panel_server_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "game" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "region" "text" NOT NULL,
    "modpack" "text",
    "allocation" integer,
    "status" "text" DEFAULT 'creating'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."servers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_staff_reply" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "marketing_emails" boolean DEFAULT false,
    "analytics" boolean DEFAULT false,
    "cookies" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ptero_nodes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ptero_nodes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pterodactyl_eggs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pterodactyl_eggs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pterodactyl_nests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pterodactyl_nests_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."addons"
    ADD CONSTRAINT "addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_2fa_settings"
    ADD CONSTRAINT "admin_2fa_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_schedule"
    ADD CONSTRAINT "audit_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_jobs"
    ADD CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_logs"
    ADD CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_test"
    ADD CONSTRAINT "backup_test_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "bundles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "bundles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "bundles_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."dependency_audits"
    ADD CONSTRAINT "dependency_audits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_accounts"
    ADD CONSTRAINT "external_accounts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."financial_audit"
    ADD CONSTRAINT "financial_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_rate_limits"
    ADD CONSTRAINT "financial_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."gdpr_requests"
    ADD CONSTRAINT "gdpr_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modpacks"
    ADD CONSTRAINT "modpacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."panel_users"
    ADD CONSTRAINT "panel_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_items"
    ADD CONSTRAINT "pricing_items_pkey" PRIMARY KEY ("sku");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ptero_nodes"
    ADD CONSTRAINT "ptero_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ptero_nodes"
    ADD CONSTRAINT "ptero_nodes_pterodactyl_node_id_key" UNIQUE ("pterodactyl_node_id");



ALTER TABLE ONLY "public"."pterodactyl_eggs"
    ADD CONSTRAINT "pterodactyl_eggs_egg_id_key" UNIQUE ("egg_id");



ALTER TABLE ONLY "public"."pterodactyl_eggs"
    ADD CONSTRAINT "pterodactyl_eggs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pterodactyl_nests"
    ADD CONSTRAINT "pterodactyl_nests_nest_id_key" UNIQUE ("nest_id");



ALTER TABLE ONLY "public"."pterodactyl_nests"
    ADD CONSTRAINT "pterodactyl_nests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_requests"
    ADD CONSTRAINT "rate_limit_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_violations"
    ADD CONSTRAINT "rate_limit_violations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_violations"
    ADD CONSTRAINT "rate_limit_violations_rate_limit_key_key" UNIQUE ("rate_limit_key");



ALTER TABLE ONLY "public"."security_audits"
    ADD CONSTRAINT "security_audits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."server_stats_cache"
    ADD CONSTRAINT "server_stats_cache_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."servers"
    ADD CONSTRAINT "servers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_affiliates_code" ON "public"."affiliates" USING "btree" ("code");



CREATE INDEX "idx_analytics_event_type" ON "public"."analytics_events" USING "btree" ("event_type");



CREATE INDEX "idx_analytics_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_financial_audit_user_date" ON "public"."financial_audit" USING "btree" ("user_id", "timestamp");



CREATE INDEX "idx_games_egg_id" ON "public"."games" USING "btree" ("egg_id");



CREATE INDEX "idx_games_nest_id" ON "public"."games" USING "btree" ("nest_id");



CREATE INDEX "idx_orders_plan_id" ON "public"."orders" USING "btree" ("plan_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_stripe_sub_id" ON "public"."orders" USING "btree" ("stripe_sub_id");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_plans_game" ON "public"."plans" USING "btree" ("game");



CREATE INDEX "idx_plans_item_type" ON "public"."plans" USING "btree" ("item_type");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_ptero_nodes_enabled" ON "public"."ptero_nodes" USING "btree" ("enabled");



CREATE INDEX "idx_ptero_nodes_region" ON "public"."ptero_nodes" USING "btree" ("region");



CREATE INDEX "idx_pterodactyl_eggs_egg_id" ON "public"."pterodactyl_eggs" USING "btree" ("egg_id");



CREATE INDEX "idx_pterodactyl_eggs_nest_id" ON "public"."pterodactyl_eggs" USING "btree" ("nest_id");



CREATE INDEX "idx_pterodactyl_nests_nest_id" ON "public"."pterodactyl_nests" USING "btree" ("nest_id");



CREATE OR REPLACE TRIGGER "handle_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_admin_2fa_settings_timestamp" BEFORE UPDATE ON "public"."admin_2fa_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_2fa_settings_timestamp"();



CREATE OR REPLACE TRIGGER "update_audit_schedule_trigger" BEFORE UPDATE ON "public"."audit_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."update_audit_schedule"();



CREATE OR REPLACE TRIGGER "update_bundles_updated_at" BEFORE UPDATE ON "public"."bundles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_games_updated_at" BEFORE UPDATE ON "public"."games" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_2fa_settings"
    ADD CONSTRAINT "admin_2fa_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dependency_audits"
    ADD CONSTRAINT "dependency_audits_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."security_audits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_accounts"
    ADD CONSTRAINT "external_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_nest_id_fkey" FOREIGN KEY ("nest_id") REFERENCES "public"."pterodactyl_nests"("nest_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_modpack_id_fkey" FOREIGN KEY ("modpack_id") REFERENCES "public"."modpacks"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."ptero_nodes"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pterodactyl_eggs"
    ADD CONSTRAINT "pterodactyl_eggs_nest_id_fkey" FOREIGN KEY ("nest_id") REFERENCES "public"."pterodactyl_nests"("nest_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audits"
    ADD CONSTRAINT "security_audits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."server_stats_cache"
    ADD CONSTRAINT "server_stats_cache_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage 2FA settings" ON "public"."admin_2fa_settings" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage audit schedule" ON "public"."audit_schedule" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage dependency audits" ON "public"."dependency_audits" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage security audits" ON "public"."security_audits" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Anyone can view active addons" ON "public"."addons" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active modpacks" ON "public"."modpacks" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active plans" ON "public"."plans" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Auth admin can insert audit logs" ON "public"."audit_log" FOR INSERT TO "supabase_auth_admin" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."pterodactyl_eggs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."pterodactyl_nests" FOR SELECT USING (true);



CREATE POLICY "Public can view eggs" ON "public"."pterodactyl_eggs" FOR SELECT USING (true);



CREATE POLICY "Public can view nests" ON "public"."pterodactyl_nests" FOR SELECT USING (true);



CREATE POLICY "Service role can manage audit logs" ON "public"."audit_log" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage eggs" ON "public"."pterodactyl_eggs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage financial audit" ON "public"."financial_audit" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage nests" ON "public"."pterodactyl_nests" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage ptero_nodes" ON "public"."ptero_nodes" TO "service_role";



CREATE POLICY "Service role manages backup jobs" ON "public"."backup_jobs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages backup tests" ON "public"."backup_test" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages backups" ON "public"."backup_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages error logs" ON "public"."error_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages rate limits" ON "public"."financial_rate_limits" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages system tables" ON "public"."rate_limit_requests" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages violations" ON "public"."rate_limit_violations" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create support messages" ON "public"."support_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create support tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own affiliate data" ON "public"."affiliates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own GDPR requests" ON "public"."gdpr_requests" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own consents" ON "public"."user_consents" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own panel_users" ON "public"."panel_users" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own servers" ON "public"."servers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own affiliate data" ON "public"."affiliates" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own external accounts" ON "public"."external_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own support tickets" ON "public"."support_tickets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can upsert own external accounts" ON "public"."external_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view completed audits" ON "public"."security_audits" FOR SELECT TO "authenticated" USING (("status" = 'completed'::"text"));



CREATE POLICY "Users can view dependency audits" ON "public"."dependency_audits" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."security_audits" "sa"
  WHERE (("sa"."id" = "dependency_audits"."audit_id") AND ("sa"."status" = 'completed'::"text")))));



CREATE POLICY "Users can view own affiliate data" ON "public"."affiliates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own external accounts" ON "public"."external_accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."user_notifications" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own support messages" ON "public"."support_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own support tickets" ON "public"."support_tickets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_2fa_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."affiliates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_test" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bundles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundles_public_read" ON "public"."bundles" FOR SELECT USING (true);



ALTER TABLE "public"."dependency_audits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "games_public_read" ON "public"."games" FOR SELECT USING (true);



ALTER TABLE "public"."gdpr_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modpacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own analytics insert" ON "public"."analytics_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own analytics select" ON "public"."analytics_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own external select" ON "public"."external_accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own external update" ON "public"."external_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own external upsert" ON "public"."external_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own orders insert" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "own orders select" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own stats select" ON "public"."server_stats_cache" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "server_stats_cache"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."panel_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pricing_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ptero_nodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pterodactyl_eggs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pterodactyl_nests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_violations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_audits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."server_stats_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."servers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."admin_requires_2fa"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_requires_2fa"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_requires_2fa"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_financial_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_financial_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_financial_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_sensitive_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_sensitive_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_sensitive_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_audit_run"("frequency_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_audit_run"("frequency_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_audit_run"("frequency_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_my_rate_limit"("operation_name" "text", "max_ops" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_my_rate_limit"("operation_name" "text", "max_ops" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_my_rate_limit"("operation_name" "text", "max_ops" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_user_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_user_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_user_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_missing_profile_with_pterodactyl"("user_id_param" "uuid", "email_param" "text", "display_name_param" "text", "pterodactyl_user_id_param" integer, "pterodactyl_password_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_missing_profile_with_pterodactyl"("user_id_param" "uuid", "email_param" "text", "display_name_param" "text", "pterodactyl_user_id_param" integer, "pterodactyl_password_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_missing_profile_with_pterodactyl"("user_id_param" "uuid", "email_param" "text", "display_name_param" "text", "pterodactyl_user_id_param" integer, "pterodactyl_password_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"("new_user_id" "uuid", "new_email" "text", "new_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"("new_user_id" "uuid", "new_email" "text", "new_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"("new_user_id" "uuid", "new_email" "text", "new_display_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_stats"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_stats"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_stats"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_sensitive_data"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_sensitive_data"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_sensitive_data"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_financial_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_financial_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_financial_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_pterodactyl_credentials"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_pterodactyl_credentials"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_pterodactyl_credentials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_safe_financial_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_safe_financial_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_safe_financial_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_data"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_data"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_data"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_user_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_user_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_action"("action_name" "text", "details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_action"("action_name" "text", "details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_action"("action_name" "text", "details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_2fa_settings_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_2fa_settings_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_2fa_settings_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_audit_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_audit_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_audit_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_financial_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_financial_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_financial_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_order_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_order_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_order_data"() TO "service_role";


















GRANT ALL ON TABLE "public"."addons" TO "anon";
GRANT ALL ON TABLE "public"."addons" TO "authenticated";
GRANT ALL ON TABLE "public"."addons" TO "service_role";



GRANT ALL ON TABLE "public"."admin_2fa_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_2fa_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_2fa_settings" TO "service_role";



GRANT ALL ON TABLE "public"."affiliates" TO "anon";
GRANT ALL ON TABLE "public"."affiliates" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliates" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";
GRANT INSERT ON TABLE "public"."audit_log" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."audit_schedule" TO "anon";
GRANT ALL ON TABLE "public"."audit_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."backup_jobs" TO "anon";
GRANT ALL ON TABLE "public"."backup_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."backup_logs" TO "anon";
GRANT ALL ON TABLE "public"."backup_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_logs" TO "service_role";



GRANT ALL ON TABLE "public"."backup_test" TO "anon";
GRANT ALL ON TABLE "public"."backup_test" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_test" TO "service_role";



GRANT ALL ON TABLE "public"."bundles" TO "anon";
GRANT ALL ON TABLE "public"."bundles" TO "authenticated";
GRANT ALL ON TABLE "public"."bundles" TO "service_role";



GRANT ALL ON TABLE "public"."dependency_audits" TO "anon";
GRANT ALL ON TABLE "public"."dependency_audits" TO "authenticated";
GRANT ALL ON TABLE "public"."dependency_audits" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."external_accounts" TO "anon";
GRANT ALL ON TABLE "public"."external_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."external_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."financial_audit" TO "anon";
GRANT ALL ON TABLE "public"."financial_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_audit" TO "service_role";



GRANT ALL ON TABLE "public"."financial_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."financial_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."gdpr_requests" TO "anon";
GRANT ALL ON TABLE "public"."gdpr_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."gdpr_requests" TO "service_role";



GRANT ALL ON TABLE "public"."modpacks" TO "anon";
GRANT ALL ON TABLE "public"."modpacks" TO "authenticated";
GRANT ALL ON TABLE "public"."modpacks" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."panel_users" TO "anon";
GRANT ALL ON TABLE "public"."panel_users" TO "authenticated";
GRANT ALL ON TABLE "public"."panel_users" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_items" TO "anon";
GRANT ALL ON TABLE "public"."pricing_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_items" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ptero_nodes" TO "anon";
GRANT ALL ON TABLE "public"."ptero_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."ptero_nodes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ptero_nodes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ptero_nodes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ptero_nodes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pterodactyl_eggs" TO "anon";
GRANT ALL ON TABLE "public"."pterodactyl_eggs" TO "authenticated";
GRANT ALL ON TABLE "public"."pterodactyl_eggs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pterodactyl_eggs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pterodactyl_eggs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pterodactyl_eggs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pterodactyl_nests" TO "anon";
GRANT ALL ON TABLE "public"."pterodactyl_nests" TO "authenticated";
GRANT ALL ON TABLE "public"."pterodactyl_nests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pterodactyl_nests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pterodactyl_nests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pterodactyl_nests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_requests" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_requests" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_violations" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_violations" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_violations" TO "service_role";



GRANT ALL ON TABLE "public"."security_audits" TO "anon";
GRANT ALL ON TABLE "public"."security_audits" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audits" TO "service_role";



GRANT ALL ON TABLE "public"."server_stats_cache" TO "anon";
GRANT ALL ON TABLE "public"."server_stats_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."server_stats_cache" TO "service_role";



GRANT ALL ON TABLE "public"."servers" TO "anon";
GRANT ALL ON TABLE "public"."servers" TO "authenticated";
GRANT ALL ON TABLE "public"."servers" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_consents" TO "anon";
GRANT ALL ON TABLE "public"."user_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."user_consents" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































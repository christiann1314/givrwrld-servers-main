-- Deduplicate duplicate rows in user_stats by keeping the most recent per user_id
WITH ranked AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.user_stats
)
DELETE FROM public.user_stats
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add a unique index on user_id so we can safely upsert by user
CREATE UNIQUE INDEX IF NOT EXISTS user_stats_user_id_unique ON public.user_stats (user_id);

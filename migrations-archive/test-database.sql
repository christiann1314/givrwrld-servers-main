-- Test if plans table exists and has data
SELECT * FROM plans LIMIT 5;

-- Check if the game column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'plans' 
AND table_schema = 'public';

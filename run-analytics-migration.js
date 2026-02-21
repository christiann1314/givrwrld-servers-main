import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://mjhvkvnshnbnxojnandf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHZrdm5zaG5ibnhvam5hbmRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgxNTQxOSwiZXhwIjoyMDY5MzkxNDE5fQ.pIsGLXM0vcAXCMdm9DiHjuaGFHU-wUEzht9RUYXYbsY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const migrationSql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '003_analytics_events.sql'), 'utf8');

async function runMigration() {
  console.log('Running analytics migration...');
  
  // Split SQL into individual statements
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 50)}...`);
    try {
      const { error } = await supabase.rpc('exec', { sql: statement });
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('✓ Success');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }
  
  console.log('🎉 Analytics migration completed!');
}

runMigration();

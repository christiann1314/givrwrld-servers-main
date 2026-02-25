// Supabase optimized client stub.
// Supabase has been removed from the live stack; this file now simply
// re-exports the basic stub from `integrations/supabase/client` so that
// any legacy imports compile without performing external calls.

import { supabase as supabaseStub } from '@/integrations/supabase/client';

export const optimizedSupabase: any = supabaseStub;

export { optimizedSupabase as supabase };

// Legacy default export for backward compatibility
export default optimizedSupabase;
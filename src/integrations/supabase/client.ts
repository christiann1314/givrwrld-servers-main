// Supabase client stub for MySQL-only / Express stack.
// This project no longer uses Supabase at runtime. This stub keeps the
// rest of the codebase type-safe without performing any external calls.

// Very loose typing on purpose – callers should handle null data / errors.
export const supabase: any = {
  auth: {
    async getSession() {
      // Behave like "no active Supabase session".
      return { data: { session: null }, error: null };
    },
  },
  from(_table: string) {
    const error = new Error('Supabase is disabled in this deployment.');
    const query: any = {
      async select() {
        return { data: null, error };
      },
      eq() {
        // Allow chained .eq().select() without throwing synchronously.
        return query;
      },
      async maybeSingle() {
        return { data: null, error };
      },
      async single() {
        return { data: null, error };
      },
    };
    return query;
  },
  functions: {
    async invoke() {
      return { data: null, error: new Error('Supabase is disabled in this deployment.') };
    },
  },
};

// Functions URL is unused when Supabase is disabled.
export const FUNCTIONS_URL = '';
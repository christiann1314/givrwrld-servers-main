// Optimized Supabase client with load balancing integration
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { trafficManager } from './trafficManager';
import { localCache } from './cache';

const SUPABASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || "";
const SUPABASE_PUBLISHABLE_KEY = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";

// Create optimized client with traffic management
const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  // Custom fetch implementation with load balancing
  global: {
    fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Check if this is a Supabase API request
      if (urlString.includes('supabase.co')) {
        try {
          // Use traffic manager for load balancing and optimization
          const path = urlString.replace(SUPABASE_URL, '');
          
          // Determine priority based on request type
          let priority = 1;
          if (path.includes('/auth/')) priority = 10; // High priority for auth
          else if (path.includes('/functions/')) priority = 8; // High for functions
          else if (path.includes('/rest/')) priority = 5; // Medium for data
          
          // Check cache first for GET requests
          if (!options?.method || options.method === 'GET') {
            const cached = localCache.getAPIResponse(path, options?.body || {});
            if (cached) {
              return new Response(JSON.stringify(cached), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
          
          const result = await trafficManager.makeRequest(path, {
            ...options,
            headers: {
              'apikey': SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
              ...options?.headers,
            },
          }, priority);
          
          // Cache successful GET responses
          if ((!options?.method || options.method === 'GET') && result) {
            localCache.setAPIResponse(path, options?.body || {}, result);
          }
          
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Traffic manager request failed:', error);
          // Fallback to regular fetch
        }
      }
      
      // Default fetch for non-Supabase requests or fallback
      return fetch(url, options);
    },
  },
});

// Enhanced client with additional optimization methods
export const optimizedSupabase = {
  ...supabaseClient,
  
  // Batch query helper
  async batchQuery<T>(
    queries: Array<() => Promise<T>>
  ): Promise<T[]> {
    const batchKey = `batch_${Date.now()}`;
    
    const results = await Promise.all(
      queries.map(async (query, index) => {
        try {
          return await trafficManager.makeRequest<T>(
            `/batch/${index}`,
            { 
              method: 'POST',
              body: JSON.stringify({ query: query.toString() })
            },
            1,
            batchKey
          );
        } catch (error) {
          console.error(`Batch query ${index} failed:`, error);
          throw error;
        }
      })
    );
    
    return results;
  },
  
  // Priority query for critical operations
  async priorityQuery<T>(
    tableName: string,
    query: any
  ): Promise<T> {
    const path = `/rest/v1/${tableName}${query.toString()}`;
    return trafficManager.makeRequest(path, {}, 10); // High priority
  },
  
  // Background query for non-critical operations
  async backgroundQuery<T>(
    tableName: string,
    query: any
  ): Promise<T> {
    const path = `/rest/v1/${tableName}${query.toString()}`;
    return trafficManager.makeRequest(path, {}, 0.1); // Low priority
  },
  
  // Health check for the connection
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('count')
        .limit(1)
        .single();
      
      return !error;
    } catch {
      return false;
    }
  },
  
  // Get connection stats
  getConnectionStats() {
    return trafficManager.getHealthStatus();
  },
};

export { optimizedSupabase as supabase };

// Legacy export for backward compatibility
export default optimizedSupabase;
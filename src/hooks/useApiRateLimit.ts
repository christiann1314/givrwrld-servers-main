import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

interface RateLimitState {
  isLimited: boolean;
  resetTime: number | null;
  requestCount: number;
  limit: number;
  remaining: number;
}

export const useApiRateLimit = () => {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isLimited: false,
    resetTime: null,
    requestCount: 0,
    limit: 0,
    remaining: 0
  });
  
  // toast is now imported directly from sonner

  const parseRateLimitHeaders = useCallback((headers: Headers): RateLimitState => {
    const limit = parseInt(headers.get('x-ratelimit-limit') || '0');
    const remaining = parseInt(headers.get('x-ratelimit-remaining') || '0');
    const resetTime = parseInt(headers.get('x-ratelimit-reset') || '0') * 1000; // Convert to ms
    const requestCount = limit - remaining;

    return {
      isLimited: remaining === 0,
      resetTime,
      requestCount,
      limit,
      remaining
    };
  }, []);

  const handleRateLimitResponse = useCallback((response: Response) => {
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const resetTime = retryAfter ? Date.now() + (parseInt(retryAfter) * 1000) : null;
      
      setRateLimitState({
        isLimited: true,
        resetTime,
        requestCount: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        remaining: 0
      });
      
      toast({
        title: "Rate limit exceeded",
        description: `Too many requests. Please wait ${retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 1} minutes before trying again.`,
        variant: "destructive"
      });
      
      return false;
    }
    
    // Update rate limit state from headers
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    setRateLimitState(rateLimitInfo);
    
    return true;
  }, [parseRateLimitHeaders, toast]);

  const checkRateLimit = useCallback(async (operation: string): Promise<boolean> => {
    try {
      // Client-side rate limiting for immediate feedback
      const storageKey = `api_rateLimit_${operation}`;
      const stored = localStorage.getItem(storageKey);
      const now = Date.now();
      
      let data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + 60000 };
      
      // Reset if time window has passed
      if (now > data.resetTime) {
        data = { count: 0, resetTime: now + 60000 };
      }
      
      // Check limits based on operation type (client-side limits are more lenient)
      const limits: { [key: string]: number } = {
        payment: 10,    // Server has 5 per 15 min, client allows 10 per min
        user_data: 50,  // Server has 30 per 5 min, client allows 50 per min
        general: 200,   // Server has 100 per min, client allows 200 per min
        sensitive: 5    // Server has 3 per hour, client allows 5 per min
      };
      
      const limit = limits[operation] || limits.general;
      
      if (data.count >= limit) {
        const resetInMinutes = Math.ceil((data.resetTime - now) / 60000);
        
        setRateLimitState({
          isLimited: true,
          resetTime: data.resetTime,
          requestCount: data.count,
          limit,
          remaining: 0
        });
        
        toast({
          title: "Rate limit exceeded",
          description: `Too many ${operation} requests. Please wait ${resetInMinutes} minute(s) before trying again.`,
          variant: "destructive"
        });
        
        return false;
      }
      
      // Increment counter
      data.count++;
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      setRateLimitState({
        isLimited: false,
        resetTime: data.resetTime,
        requestCount: data.count,
        limit,
        remaining: limit - data.count
      });
      
      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow request if check fails
    }
  }, [toast]);

  return {
    checkRateLimit,
    handleRateLimitResponse,
    parseRateLimitHeaders,
    rateLimitState
  };
};
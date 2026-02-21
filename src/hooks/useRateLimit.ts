import { useState, useCallback } from 'react';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
  blockUntil: number;
}

export const useRateLimit = (maxAttempts: number = 5, blockDuration: number = 15 * 60 * 1000) => {
  const [state, setState] = useState<RateLimitState>(() => {
    const stored = localStorage.getItem('auth-rate-limit');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Reset if block period has expired
        if (parsed.blockUntil && now > parsed.blockUntil) {
          return { attempts: 0, lastAttempt: 0, isBlocked: false, blockUntil: 0 };
        }
        
        return parsed;
      } catch {
        return { attempts: 0, lastAttempt: 0, isBlocked: false, blockUntil: 0 };
      }
    }
    return { attempts: 0, lastAttempt: 0, isBlocked: false, blockUntil: 0 };
  });

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // If currently blocked, check if block period has expired
    if (state.isBlocked && now > state.blockUntil) {
      const newState = { attempts: 0, lastAttempt: 0, isBlocked: false, blockUntil: 0 };
      setState(newState);
      localStorage.setItem('auth-rate-limit', JSON.stringify(newState));
      return { allowed: true, timeRemaining: 0 };
    }
    
    if (state.isBlocked) {
      return { 
        allowed: false, 
        timeRemaining: Math.ceil((state.blockUntil - now) / 1000) 
      };
    }
    
    return { allowed: true, timeRemaining: 0 };
  }, [state, blockDuration]);

  const recordAttempt = useCallback((failed: boolean) => {
    const now = Date.now();
    
    if (failed) {
      const newAttempts = state.attempts + 1;
      const newState: RateLimitState = {
        attempts: newAttempts,
        lastAttempt: now,
        isBlocked: newAttempts >= maxAttempts,
        blockUntil: newAttempts >= maxAttempts ? now + blockDuration : 0
      };
      
      setState(newState);
      localStorage.setItem('auth-rate-limit', JSON.stringify(newState));
    } else {
      // Reset on successful attempt
      const newState = { attempts: 0, lastAttempt: 0, isBlocked: false, blockUntil: 0 };
      setState(newState);
      localStorage.setItem('auth-rate-limit', JSON.stringify(newState));
    }
  }, [state, maxAttempts, blockDuration]);

  const reset = useCallback(() => {
    const newState = { attempts: 0, lastAttempt: 0, isBlocked: false, blockUntil: 0 };
    setState(newState);
    localStorage.removeItem('auth-rate-limit');
  }, []);

  return {
    checkRateLimit,
    recordAttempt,
    reset,
    isBlocked: state.isBlocked,
    attempts: state.attempts,
    maxAttempts
  };
};
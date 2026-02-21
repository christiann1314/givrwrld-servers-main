
import * as React from 'react';
import { api } from '@/lib/api';
import { analytics } from '@/services/analytics';

interface User {
  id: string;
  email: string;
  display_name?: string;
  is_email_verified?: boolean;
  // Legacy compatibility fields
  user_metadata?: {
     full_name?: string;
     first_name?: string;
     last_name?: string;
   };
}

interface Session {
  user: User;
  access_token: string;
}

export const useAuth = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const refreshFromAuthEvent = () => {
      checkSession();
    };

    // Keep multiple hook instances in sync after login/logout/signup.
    window.addEventListener('auth-changed', refreshFromAuthEvent);
    window.addEventListener('storage', refreshFromAuthEvent);
    checkSession();

    return () => {
      window.removeEventListener('auth-changed', refreshFromAuthEvent);
      window.removeEventListener('storage', refreshFromAuthEvent);
    };
  }, []);

  const checkSession = async () => {
    try {
      const response = await api.getCurrentUser();
      if (response.success && response.data) {
        const user = response.data.user;
        setUser(user);
        setSession({ user, access_token: api['token'] || '' });
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    // Security: Validate input parameters
    if (!email || !password) {
      return { error: { message: 'Email and password are required' } };
    }
    
    // Security: Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();
    
    try {
      const response = await api.signUp(sanitizedEmail, password, firstName, lastName);
      
      if (response.success) {
        // Verification-first flow: account is created unverified and no session is issued.
        if (response.data?.token && response.data?.user) {
          const user = response.data.user;
          setUser(user);
          setSession({ user, access_token: response.data.token });
          window.dispatchEvent(new Event('auth-changed'));
          await analytics.trackUserSignup(user.id);
        }
        return { error: null, pendingVerification: !!response.pendingVerification, message: response.message };
      } else {
        return { error: { message: response.error || 'Signup failed' }, pendingVerification: false };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Signup failed' }, pendingVerification: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Security: Validate input parameters
    if (!email || !password) {
      return { error: { message: 'Email and password are required' } };
    }
    
    // Security: Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();
    
    try {
      const response = await api.signIn(sanitizedEmail, password);
      
      if (response.success && response.data) {
        const user = response.data.user;
        setUser(user);
        setSession({ user, access_token: response.data.token });
        window.dispatchEvent(new Event('auth-changed'));
        
        // Track login
        await analytics.trackUserLogin(user.id);
        
        // TODO: Create Pterodactyl user if needed
        // This can be done via API endpoint if needed
        
        return { error: null };
      } else {
        return { error: { message: response.error || 'Login failed' } };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Login failed' } };
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
      setUser(null);
      setSession(null);
      window.dispatchEvent(new Event('auth-changed'));
      return { error: null };
    } catch (error) {
      console.error('Logout error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Logout failed' } };
    }
  };

  return {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    signUp,
    signIn,
    signOut,
    // Legacy compatibility
    login: signIn,
    logout: signOut
  };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  loading: boolean;
}

export const useSubscription = (userEmail?: string) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    loading: false
  });
  // toast is now imported directly from sonner

  const checkSubscription = async () => {
    if (!userEmail) return;
    
    setSubscriptionStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // Call Supabase Edge Function instead of Laravel API
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { email: userEmail }
      });
      
      if (error) {
        console.error('Failed to check subscription:', error);
        setSubscriptionStatus(prev => ({ ...prev, loading: false }));
        return;
      }
      
      setSubscriptionStatus({
        subscribed: data.hasSubscription,
        subscription_tier: data.subscription?.items?.[0]?.price?.interval || 'monthly',
        subscription_end: data.subscription?.current_period_end ? 
          new Date(data.subscription.current_period_end * 1000).toISOString() : undefined,
        loading: false
      });
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setSubscriptionStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const createCheckout = async (planName: string, amount: number) => {
    if (!userEmail) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe.",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Use existing create-checkout-session Supabase function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan_name: planName,
          amount: amount,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/cancel`,
          billing_term: 'monthly'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }
      
      window.open(data.checkout_url, '_blank');
      
      toast({
        title: "Redirecting to checkout",
        description: "Please complete your subscription in the new tab.",
      });
      
      return data;
    } catch (error) {
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
      return null;
    }
  };

  const openCustomerPortal = async () => {
    if (!userEmail) {
      toast({
        title: "Authentication Required", 
        description: "Please log in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call Supabase Edge Function instead of Laravel API
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {
          email: userEmail,
          return_url: window.location.origin
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to open customer portal');
      }
      
      window.open(data.url, '_blank');
      
      toast({
        title: "Opening Customer Portal",
        description: "Manage your subscription in the new tab.",
      });
    } catch (error) {
      toast({
        title: "Portal Error",
        description: error instanceof Error ? error.message : "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userEmail) {
      checkSubscription();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(checkSubscription, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail]);

  return {
    subscriptionStatus,
    checkSubscription,
    createCheckout,
    openCustomerPortal
  };
};
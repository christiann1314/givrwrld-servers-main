
import { useState } from 'react';
import { stripeService, CheckoutSessionData } from '../services/stripeService';
import { toast } from '@/components/ui/use-toast';

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  // toast is now imported directly from sonner

  const createCheckoutSession = async (data: CheckoutSessionData) => {
    setIsLoading(true);
    try {
      console.log('Creating checkout session with data:', data);
      const response = await stripeService.createCheckoutSession(data);
      console.log('Checkout response:', response);
      
      if (!response.checkout_url) {
        throw new Error('No checkout URL received from server');
      }
      
      // Redirect to checkout (PayPal) in a new tab
      const newTab = window.open(response.checkout_url, '_blank');
      
      if (!newTab) {
        throw new Error('Failed to open checkout tab. Please disable popup blockers and try again.');
      }
      
      toast({
        title: "Redirecting to checkout",
        description: "Please complete your payment in the new tab.",
      });
      
      return response;
    } catch (error) {
      console.error('Detailed checkout error:', error);
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckoutSession,
    isLoading,
  };
};

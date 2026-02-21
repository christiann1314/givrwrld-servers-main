import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';
import { useStripeCheckout } from '../hooks/useStripeCheckout';

interface UpgradePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageData: {
    name: string;
    price: string;
    planId?: string;
    itemType?: 'game' | 'vps' | 'upgrade' | 'bundle' | 'addon';
    features: string[];
  };
}

const UpgradePaymentModal: React.FC<UpgradePaymentModalProps> = ({
  isOpen,
  onClose,
  packageData,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { createCheckoutSession, isLoading } = useStripeCheckout();

  if (!isOpen) return null;

  const handleCompletePurchase = async () => {
    // Check if user is authenticated before processing payment
    if (!isAuthenticated) {
      navigate('/signup', { 
        state: { 
          returnTo: window.location.pathname,
          message: 'Please create an account to complete your purchase'
        }
      });
      onClose();
      return;
    }

    try {
      // Extract price from string (e.g., "$29.99" -> 2999 cents)
      const priceMatch = packageData.price.match(/\$(\d+\.?\d*)/);
      const amount = priceMatch ? Math.round(parseFloat(priceMatch[1]) * 100) : 0;

      await createCheckoutSession({
        item_type: (packageData.itemType || 'vps') as const,
        plan_id: packageData.planId || packageData.name.toLowerCase().replace(/\s+/g, '-'),
        region: 'us-east',
        server_name: packageData.name,
        term: 'monthly',
        success_url: `${window.location.origin}/purchase-confirmed?package=${encodeURIComponent(packageData.name)}`,
        cancel_url: window.location.href,
        amount: amount,
      });
      
      onClose();
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Complete Your Purchase</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Authentication Notice */}
          {!isAuthenticated && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-black text-xs font-bold">!</span>
                </div>
                <h4 className="text-yellow-400 font-semibold">Account Required</h4>
              </div>
              <p className="text-yellow-300 text-sm">
                You'll need to create an account to complete your purchase. Click "Purchase" to sign up.
              </p>
            </div>
          )}

          {/* Package Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">{packageData.name}</h3>
            <div className="text-3xl font-bold text-emerald-400 mb-4">{packageData.price}</div>
            
            <div className="space-y-2">
              <h4 className="text-white font-medium">Included Features:</h4>
              <div className="grid gap-1">
                {packageData.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center text-gray-300 text-sm">
                    <Check size={14} className="text-emerald-400 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
                {packageData.features.length > 4 && (
                  <div className="text-gray-400 text-sm">
                    +{packageData.features.length - 4} more features
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePurchase}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
            >
              {isLoading ? 'Creating Checkout...' : !isAuthenticated ? 'Sign Up to Purchase' : `Purchase for ${packageData.price}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePaymentModal;

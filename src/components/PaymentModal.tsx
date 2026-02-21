import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';
import { stripeService } from '../services/stripeService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameData: {
    name: string;
    icon: string | React.ReactNode;
    basePrice: number;
    features: string[];
  };
  selectedPlan: {
    ram: string;
    price: number;
    description: string;
    recommended?: boolean;
  };
  billingPeriod: string;
  addOns: Record<string, boolean>;
  addOnOptions: Array<{
    key: string;
    name: string;
    description: string;
    price: number;
  }>;
  selectedBundle: string;
  serviceBundles: Array<{
    id: string;
    name: string;
    price: number;
    inclusions: string[];
  }>;
  serverName: string;
  location: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  gameData,
  selectedPlan,
  billingPeriod,
  addOns,
  addOnOptions,
  selectedBundle,
  serviceBundles,
  serverName,
  location,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paypal' | 'credit-card' | 'crypto'>('paypal');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('eth');
  
  // Credit card form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [zipCode, setZipCode] = useState('');

  if (!isOpen) return null;

  const getBillingMultiplier = () => {
    switch (billingPeriod) {
      case '3months': return 3;
      case '6months': return 6;
      case '12months': return 12;
      default: return 1;
    }
  };

  const getBillingDiscount = () => {
    const billingOptions = [
      { value: 'monthly', discountPercent: 0 },
      { value: '3months', discountPercent: 5 },
      { value: '6months', discountPercent: 10 },
      { value: '12months', discountPercent: 20 },
    ];
    const option = billingOptions.find(opt => opt.value === billingPeriod);
    return option ? option.discountPercent / 100 : 0;
  };

  const calculateSubtotal = () => {
    let total = selectedPlan.price;
    
    // Add service bundle
    const bundle = serviceBundles.find(b => b.id === selectedBundle);
    if (bundle) total += bundle.price;
    
    Object.entries(addOns).forEach(([key, enabled]) => {
      if (enabled) {
        const addOn = addOnOptions.find(option => option.key === key);
        if (addOn) total += addOn.price;
      }
    });
    return total;
  };

  const calculateActualTotal = () => {
    const subtotal = calculateSubtotal();
    const multiplier = getBillingMultiplier();
    const discount = getBillingDiscount();
    const totalBeforeDiscount = subtotal * multiplier;
    const discountAmount = totalBeforeDiscount * discount;
    return totalBeforeDiscount - discountAmount;
  };

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

    setIsProcessing(true);
    
    try {
      const checkoutData = {
        item_type: 'game' as const,
        plan_id: `${gameData.name.toLowerCase()}-${selectedPlan.ram.toLowerCase().replace(' ', '')}`,
        region: location || 'us-west',
        server_name: serverName || `${gameData.name} Server`,
        term: (billingPeriod === '3months' ? 'quarterly' : billingPeriod === '6months' ? 'semiannual' : billingPeriod === '12months' ? 'yearly' : 'monthly') as 'monthly' | 'quarterly' | 'semiannual' | 'yearly',
        success_url: `${window.location.origin}/success`,
        cancel_url: `${window.location.origin}/dashboard`,
        amount: Math.round(calculateActualTotal() * 100),
      };
      
      const response = await stripeService.createCheckoutSession(checkoutData);
      
      // Redirect to PayPal Checkout
      window.open(response.checkout_url, '_blank');
      
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };

  const renderPaymentForm = () => {
    switch (selectedPaymentMethod) {
      case 'paypal':
        return (
          <div className="space-y-4">
            <h4 className="text-white font-semibold">PayPal Information</h4>
            <input
              type="email"
              placeholder="Enter your PayPal email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
            />
          </div>
        );
      
      case 'crypto':
        return (
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Cryptocurrency Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Select Cryptocurrency</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCrypto('eth')}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedCrypto === 'eth'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-sm">Ethereum</div>
                      <div className="text-xs opacity-75">ETH</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCrypto('xrp')}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedCrypto === 'xrp'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-sm">Ripple</div>
                      <div className="text-xs opacity-75">XRP</div>
                    </div>
                  </button>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-2">
                  You will be redirected to complete your {selectedCrypto.toUpperCase()} payment
                </p>
                <p className="text-gray-400 text-xs">
                  Payment address will be provided on the next step
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Payment Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="ZIP Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Complete Your Order</DialogTitle>
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
                You'll need to create an account to complete your purchase. Click "Complete Purchase" to sign up.
              </p>
            </div>
          )}

          {/* Server Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-600/50 rounded-lg flex items-center justify-center">
                {typeof gameData.icon === 'string' ? gameData.icon : gameData.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold">{gameData.name} Server</h3>
                <p className="text-gray-400 text-sm">{serverName}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">RAM:</span>
                <span className="text-white ml-2">{selectedPlan.ram}</span>
              </div>
              <div>
                <span className="text-gray-400">Location:</span>
                <span className="text-white ml-2">US West</span>
              </div>
            </div>
          </div>

          {/* Billing Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Billing Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Server Plan</span>
                <span className="text-white">${selectedPlan.price.toFixed(2)}/month</span>
              </div>
              
              {selectedBundle !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    {serviceBundles.find(b => b.id === selectedBundle)?.name}
                  </span>
                  <span className="text-emerald-400">+${serviceBundles.find(b => b.id === selectedBundle)?.price.toFixed(2)}/month</span>
                </div>
              )}
              
              {Object.entries(addOns).map(([key, enabled]) => {
                if (!enabled) return null;
                const addOn = addOnOptions.find(option => option.key === key);
                if (!addOn) return null;
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400">{addOn.name}</span>
                    <span className="text-white">${addOn.price.toFixed(2)}/month</span>
                  </div>
                );
              })}
              
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-emerald-400 font-bold">${calculateActualTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Payment Method</h4>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('credit-card')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPaymentMethod === 'credit-card'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className={`font-semibold text-sm ${
                    selectedPaymentMethod === 'credit-card' ? 'text-emerald-400' : 'text-white'
                  }`}>Credit Card</div>
                  <div className="text-xs text-gray-400 mt-1">Visa, Mastercard</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('paypal')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPaymentMethod === 'paypal'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className={`font-semibold text-sm ${
                    selectedPaymentMethod === 'paypal' ? 'text-emerald-400' : 'text-white'
                  }`}>PayPal</div>
                  <div className="text-xs text-gray-400 mt-1">Secure payment</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('crypto')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPaymentMethod === 'crypto'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className={`font-semibold text-sm ${
                    selectedPaymentMethod === 'crypto' ? 'text-emerald-400' : 'text-white'
                  }`}>Crypto</div>
                  <div className="text-xs text-gray-400 mt-1">ETH, XRP</div>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Payment Form */}
          {renderPaymentForm()}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePurchase}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white"
            >
              {isProcessing ? 'Processing...' : !isAuthenticated ? 'Sign Up to Purchase' : 'Complete Purchase'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;

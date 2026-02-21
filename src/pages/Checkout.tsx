import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CreditCard, Shield, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { stripeService } from "@/services/stripeService";

interface Plan {
  id: string;
  name: string;
  game_type: string;
  ram: string;
  cpu: string;
  disk: string;
  location: string;
  stripe_price_id: string;
  price: number;
}

const Checkout = () => {
  const { game } = useParams<{ game: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [region] = React.useState('us-east');
  const [loading, setLoading] = React.useState(false);
  const [loadingPlan, setLoadingPlan] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch real plan data from API
  React.useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoadingPlan(true);
        setError(null);
        
        if (!game) {
          throw new Error('Game type not specified');
        }

        // Fetch plans from API
        const response = await api.getPlans();
        
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to load plans');
        }

        // Find plan matching game type (default to 8GB)
        const plans = response?.plans || [];
        const matchingPlan = plans.find((p: any) => 
          p.game === game && p.id.includes('8gb')
        ) || plans.find((p: any) => p.game === game);

        if (!matchingPlan) {
          throw new Error(`No plan found for ${game}`);
        }

        // Map API plan format to component format
        setPlan({
          id: matchingPlan.id,
          name: matchingPlan.display_name || matchingPlan.id,
          game_type: matchingPlan.game,
          ram: `${matchingPlan.ram_gb}GB`,
          cpu: `${matchingPlan.vcores} vCPU`,
          disk: `${matchingPlan.ssd_gb}GB SSD`,
          location: 'us-east',
          stripe_price_id: matchingPlan.paypal_plan_id || matchingPlan.stripe_price_id || '',
          price: parseFloat(matchingPlan.price_monthly)
        });
      } catch (error) {
        console.error('Error fetching plan:', error);
        setError(error instanceof Error ? error.message : 'Failed to load plan details');
        toast.error('Failed to load plan details');
      } finally {
        setLoadingPlan(false);
      }
    };

    if (game) {
      fetchPlan();
    }
  }, [game]);

  const handleCheckout = async () => {
    if (!plan || !user) {
      toast.error('Missing plan or user information');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use API to create checkout session
      const checkoutData = await stripeService.createCheckoutSession({
        plan_id: plan.id,
        item_type: 'game',
        region: 'us-east',
        server_name: `${game}-${Date.now()}`,
        term: 'monthly'
      });

      if (!checkoutData.checkout_url) {
        throw new Error('No checkout URL received');
      }
      
      // Redirect to PayPal Checkout
      window.location.href = checkoutData.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout process';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading plan details...</span>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Plan not found</h1>
          <p className="text-gray-400 mb-6">
            {error || 'The requested plan could not be loaded. Please try again.'}
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/deploy')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deploy
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/deploy')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deploy
            </Button>
            <h1 className="text-3xl font-bold">Complete Your Order</h1>
            <p className="text-gray-400 mt-2">
              Review your plan details and proceed to secure payment
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plan Details */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span className="capitalize">{plan.game_type}</span>
                    <Badge variant="secondary">Server</Badge>
                  </CardTitle>
                  <CardDescription>
                    High-performance {plan.game_type} server hosting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <h4 className="font-semibold text-green-400">RAM</h4>
                      <p className="text-2xl font-bold">{plan.ram}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-400">CPU</h4>
                      <p className="text-2xl font-bold">{plan.cpu}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-400">Storage</h4>
                      <p className="text-2xl font-bold">{plan.disk}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-400">Region</h4>
                      <p className="text-2xl font-bold">US East</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">What's Included:</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>99.9% Uptime SLA</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Anti-DDoS Protection</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>NVMe SSD Storage</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>24/7 Support</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Instant Setup</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Checkout Summary */}
            <div>
              <Card className="bg-gray-800 border-gray-700 sticky top-8">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>{plan.game_type} Server ({plan.ram})</span>
                    <span className="font-semibold">${plan.price}/month</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Region: US East</span>
                    <span className="text-sm text-gray-400">Included</span>
                  </div>

                  <hr className="border-gray-700" />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${plan.price}/month</span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Proceed to Payment
                      </>
                    )}
                  </Button>

                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Shield className="h-4 w-4" />
                    <span>Secure payment by PayPal</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Server ready in under 60 seconds</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;


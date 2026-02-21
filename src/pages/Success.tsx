import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Server, CreditCard, Calendar } from 'lucide-react';
import api from '@/lib/api';

interface OrderDetails {
  id: string;
  plan_name: string;
  ram: string;
  cpu: string;
  disk: string;
  location: string;
  game_type: string;
  status: string;
  created_at: string;
  total_amount: number;
}

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const subscriptionId = searchParams.get('subscription_id');
  const plan = searchParams.get('plan');
  const ram = searchParams.get('ram');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (orderId || sessionId || subscriptionId) {
          // Local/dev fallback: finalize order directly when webhook delivery is unavailable.
          if (orderId) {
            try {
              await api.finalizePayPalOrder(orderId);
            } catch (finalizeErr) {
              // Non-fatal here; order polling below still reflects current backend state.
              console.warn('Finalize order attempt skipped/failed:', finalizeErr);
            }
          }

          // Fetch order details from API
          try {
            const ordersResponse = await api.getOrders();
            const orders = ordersResponse?.orders || [];
            // Find order by order_id (PayPal), subscription_id (PayPal), or stripe_session_id (Stripe)
            const order = orders.find((o: any) => o.id === orderId)
              || orders.find((o: any) => o.paypal_subscription_id === subscriptionId)
              || orders.find((o: any) => o.stripe_session_id === sessionId)
              || orders[0];
            
            if (order) {
              setOrderDetails({
                id: order.id,
                plan_name: order.plan_id || plan || 'Game Server',
                ram: order.ram || ram || '1GB',
                cpu: order.cpu || '1 vCPU',
                disk: order.disk || '20GB',
                location: order.region || 'US-East',
                game_type: order.game_type || 'minecraft',
                status: order.status || 'processing',
                created_at: order.created_at || new Date().toISOString(),
                total_amount: order.amount || 0
              });
            } else {
              setError('Order not found');
            }
          } catch (apiError) {
            console.error('Error fetching order:', apiError);
            setError('Failed to load order details');
          }
        } else {
          // Fallback to URL params if no session ID
          setOrderDetails({
            id: 'pending',
            plan_name: plan || 'Game Server',
            ram: ram || '1GB',
            cpu: '1 vCPU',
            disk: '20GB',
            location: 'US-East',
            game_type: 'minecraft',
            status: 'processing',
            created_at: new Date().toISOString(),
            total_amount: 0
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An error occurred while loading your order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, sessionId, subscriptionId, plan, ram]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              Payment Successful! 🎉
            </CardTitle>
            <p className="text-gray-300 mt-2">
              Your server is being provisioned and will be ready shortly.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {orderDetails && (
              <>
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Server Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Plan:</span>
                      <p className="text-white font-medium">{orderDetails.plan_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">RAM:</span>
                      <p className="text-white font-medium">{orderDetails.ram}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">CPU:</span>
                      <p className="text-white font-medium">{orderDetails.cpu}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Storage:</span>
                      <p className="text-white font-medium">{orderDetails.disk}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Location:</span>
                      <p className="text-white font-medium">{orderDetails.location}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Game:</span>
                      <p className="text-white font-medium capitalize">{orderDetails.game_type}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Order Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Order ID:</span>
                      <span className="text-white font-mono">{orderDetails.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400 font-medium capitalize">{orderDetails.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">
                        {new Date(orderDetails.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {orderDetails.total_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-white font-semibold">
                          ${orderDetails.total_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-semibold mb-2">What's Next?</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Your server is being automatically provisioned</li>
                <li>• You'll receive an email with server details once ready</li>
                <li>• Access your server through the dashboard</li>
                <li>• Support is available 24/7 if you need help</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => navigate('/deploy')} 
                variant="outline" 
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Deploy Another Server
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Success;
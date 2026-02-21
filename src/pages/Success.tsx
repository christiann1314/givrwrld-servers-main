import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Server, CreditCard, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

/** Order shape from API (getOrders): live data only */
interface LiveOrder {
  id: string;
  plan_id?: string;
  plan_name?: string;
  game?: string;
  ram_gb?: number;
  vcores?: number;
  ssd_gb?: number;
  region?: string;
  server_name?: string;
  status: string;
  created_at: string;
  billed_amount?: number;
  total_amount?: number;
  paypal_subscription_id?: string;
  stripe_session_id?: string;
}

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('order_id');
  const subscriptionId = searchParams.get('subscription_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        // Finalize PayPal order when we have order_id (e.g. return from PayPal)
        if (orderId) {
          try {
            await api.finalizePayPalOrder(orderId);
          } catch (e) {
            console.warn('Finalize order attempt skipped/failed:', e);
          }
        }

        const res = await api.getOrders();
        const orders: LiveOrder[] = Array.isArray(res?.orders) ? res.orders : [];

        // Match order by order_id, subscription_id, or legacy session_id
        const matched =
          orders.find((o) => o.id === orderId) ||
          orders.find((o) => o.paypal_subscription_id === subscriptionId) ||
          (sessionId && orders.find((o) => (o as any).stripe_session_id === sessionId)) ||
          null;

        if (matched) {
          setOrder(matched);
        } else if (orders.length > 0 && !orderId && !subscriptionId && !sessionId) {
          setOrder(orders[0]);
        } else if (orders.length === 0) {
          setError(orderId ? null : null);
        } else {
          setError(orderId ? null : 'Order not found. It may still be processing.');
        }
      } catch (err) {
        console.error('Error loading order:', err);
        // When we have order_id from PayPal return, show success anyway (e.g. 401 before session restored)
        setError(orderId ? null : 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, subscriptionId, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/32 to-gray-900/58" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mb-4" />
          <p className="text-gray-300 text-lg">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error && !orderId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/32 to-gray-900/58" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <div className="glass-panel-strong rounded-xl p-8 max-w-md w-full border border-gray-600/50">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertCircle className="h-8 w-8 flex-shrink-0" />
              <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            </div>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const amount = order?.billed_amount ?? order?.total_amount ?? 0;
  const ram = order?.ram_gb != null ? `${order.ram_gb} GB` : null;
  const cpu = order?.vcores != null ? `${order.vcores} vCPU` : null;
  const disk = order?.ssd_gb != null ? `${order.ssd_gb} GB` : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background – match Dashboard */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/32 to-gray-900/58" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Success header */}
          <div className="glass-panel-strong rounded-xl p-6 lg:p-8 text-center border border-gray-600/50">
            <div className="mx-auto mb-4 w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Payment successful
              </span>
            </h1>
            <p className="text-gray-300">
              {order
                ? 'Your server is being provisioned and will be ready shortly.'
                : orderId
                  ? 'Your order is being processed.'
                  : 'View order details below or manage servers from your dashboard.'}
            </p>
          </div>

          {!order && !orderId && (
            <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
              <p className="text-gray-300">You don’t have any orders yet. Deploy a server from your dashboard to get started.</p>
            </div>
          )}

          {orderId && !order && (
            <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
              <p className="text-gray-300 mb-2">Your order is being processed. You can check status in your dashboard shortly.</p>
              <p className="text-sm text-gray-400 font-mono">Order ID: {orderId}</p>
            </div>
          )}

          {order && (
            <>
              {/* Server details – live data only */}
              <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="h-5 w-5 text-emerald-400" />
                  Server details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {order.plan_name && (
                    <div>
                      <span className="text-gray-400">Plan</span>
                      <p className="text-white font-medium">{order.plan_name}</p>
                    </div>
                  )}
                  {order.game && (
                    <div>
                      <span className="text-gray-400">Game</span>
                      <p className="text-white font-medium capitalize">{order.game.replace(/-/g, ' ')}</p>
                    </div>
                  )}
                  {ram && (
                    <div>
                      <span className="text-gray-400">RAM</span>
                      <p className="text-white font-medium">{ram}</p>
                    </div>
                  )}
                  {cpu && (
                    <div>
                      <span className="text-gray-400">CPU</span>
                      <p className="text-white font-medium">{cpu}</p>
                    </div>
                  )}
                  {disk && (
                    <div>
                      <span className="text-gray-400">Storage</span>
                      <p className="text-white font-medium">{disk}</p>
                    </div>
                  )}
                  {order.region && (
                    <div>
                      <span className="text-gray-400">Region</span>
                      <p className="text-white font-medium">
                        {order.region === 'us-central' || order.region === 'us-east' ? 'US East' : order.region}
                      </p>
                    </div>
                  )}
                  {order.server_name && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Server name</span>
                      <p className="text-white font-medium">{order.server_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order info – live data only */}
              <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-400" />
                  Order information
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Order ID</span>
                    <span className="text-white font-mono">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className="text-emerald-400 font-medium capitalize">{order.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white">
                      {new Date(order.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {Number(amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount</span>
                      <span className="text-white font-semibold">${Number(amount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* What's next */}
          <div className="glass-panel-strong rounded-xl p-6 border border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-emerald-300 font-semibold mb-2">What&apos;s next?</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Your server is being automatically provisioned</li>
              <li>• You can track it from your dashboard</li>
              <li>• Open the Game Panel to manage your server once it&apos;s ready</li>
              <li>• Contact support if you need help</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              asChild
            >
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-gray-500 text-gray-200 hover:bg-gray-700/50"
              asChild
            >
              <Link to="/deploy">Deploy another server</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;

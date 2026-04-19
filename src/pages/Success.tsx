import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle,
  Server,
  CreditCard,
  Loader2,
  AlertCircle,
  Check,
  Circle,
} from 'lucide-react';
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
  error_message?: string | null;
  ptero_server_id?: number | null;
}

const TERMINAL_STATUSES = new Set(['playable', 'failed', 'error', 'canceled']);

function isTerminalStatus(status: string | undefined): boolean {
  return TERMINAL_STATUSES.has(String(status || '').toLowerCase());
}

type StepState = 'wait' | 'active' | 'done' | 'error';

function getSetupSteps(
  statusRaw: string | undefined,
  pteroServerId: number | null | undefined,
): {
  id: string;
  label: string;
  detail: string;
  state: StepState;
}[] {
  const s = String(statusRaw || '').toLowerCase();
  const hasPanelServer = pteroServerId != null && Number(pteroServerId) > 0;

  let alloc: StepState = 'wait';
  let install: StepState = 'wait';
  let ready: StepState = 'wait';

  if (s === 'playable') {
    alloc = 'done';
    install = 'done';
    ready = 'done';
  } else if (s === 'failed' || s === 'error') {
    if (!hasPanelServer) {
      alloc = 'error';
      install = 'wait';
      ready = 'error';
    } else {
      alloc = 'done';
      install = 'error';
      ready = 'error';
    }
  } else if (['pending', 'paid', 'provisioning'].includes(s)) {
    alloc = 'active';
  } else if (s === 'provisioned') {
    alloc = 'done';
    install = 'active';
  } else if (['configuring', 'verifying'].includes(s)) {
    alloc = 'done';
    install = 'active';
  }

  return [
    {
      id: 'pay',
      label: 'Payment confirmed',
      detail: 'Your subscription or checkout completed successfully.',
      state: 'done',
    },
    {
      id: 'alloc',
      label: 'Creating your server',
      detail: 'Reserving resources and registering with the game panel.',
      state: alloc,
    },
    {
      id: 'install',
      label: 'Install & health checks',
      detail: 'The panel downloads the game and runs first-time setup.',
      state: install,
    },
    {
      id: 'ready',
      label: 'Ready to play',
      detail: 'When this step completes, open your dashboard to connect.',
      state: ready,
    },
  ];
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 border border-emerald-500/60">
        <Check className="h-4 w-4 text-emerald-300" strokeWidth={3} />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/50">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20 border border-red-500/50">
        <AlertCircle className="h-4 w-4 text-red-300" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-600/70 bg-gray-800/40">
      <Circle className="h-3 w-3 text-gray-500" />
    </div>
  );
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

  const watchId = order?.id || orderId || null;

  const fetchOrdersAndMatch = useCallback(async () => {
    const res = await api.getOrders();
    const orders: LiveOrder[] = Array.isArray(res?.orders) ? res.orders : [];
    const matched =
      (orderId && orders.find((o) => o.id === orderId)) ||
      (subscriptionId && orders.find((o) => o.paypal_subscription_id === subscriptionId)) ||
      (sessionId && orders.find((o) => (o as any).stripe_session_id === sessionId)) ||
      null;
    if (matched) return matched;
    if (orders.length > 0 && !orderId && !subscriptionId && !sessionId) return orders[0];
    return null;
  }, [orderId, subscriptionId, sessionId]);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (orderId) {
          try {
            await api.finalizePayPalOrder(orderId);
          } catch (e) {
            console.warn('Finalize order attempt skipped/failed:', e);
          }
        }

        const matched = await fetchOrdersAndMatch();

        if (matched) {
          setOrder(matched);
        } else if (orderId || subscriptionId || sessionId) {
          setOrder(null);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error loading order:', err);
        setError(orderId ? null : 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, subscriptionId, sessionId, fetchOrdersAndMatch]);

  useEffect(() => {
    if (!watchId) return;
    if (order && isTerminalStatus(order.status)) return;

    const tick = async () => {
      try {
        const res = await api.getOrders();
        const orders: LiveOrder[] = Array.isArray(res?.orders) ? res.orders : [];
        const found = orders.find((o) => o.id === watchId);
        if (found) setOrder(found);
      } catch {
        /* ignore poll errors */
      }
    };

    const iv = setInterval(tick, 2800);
    return () => clearInterval(iv);
  }, [watchId, order?.status]);

  const steps = useMemo(
    () => getSetupSteps(order?.status, order?.ptero_server_id),
    [order?.status, order?.ptero_server_id],
  );

  const headlineSub = useMemo(() => {
    if (!order) {
      if (orderId) return 'We are linking your payment to your order. This updates automatically.';
      return 'View order details below or manage servers from your dashboard.';
    }
    const s = order.status.toLowerCase();
    if (s === 'playable') return 'Your server is ready. Open the dashboard for connection details.';
    if (s === 'failed' || s === 'error') {
      return 'Something went wrong while creating the server. See details below or contact support.';
    }
    if (['pending', 'paid', 'provisioning', 'provisioned', 'configuring', 'verifying'].includes(s)) {
      return 'Your server is being set up. Progress below updates live—no need to refresh.';
    }
    return 'Check your dashboard for the latest status.';
  }, [order, orderId]);

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
          <p className="text-gray-100 text-lg">Confirming your order…</p>
          <p className="text-gray-400 text-sm mt-2 max-w-sm text-center">
            Retrieving payment and server status from your account.
          </p>
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
            <p className="text-gray-100 mb-6">{error}</p>
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
  const showProgress = Boolean(order && !isTerminalStatus(order.status));
  const failed = order && (order.status.toLowerCase() === 'failed' || order.status.toLowerCase() === 'error');

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
        <div className="w-full max-w-2xl space-y-6">
          <div className="glass-panel-strong rounded-xl p-6 lg:p-8 text-center border border-gray-600/50">
            <div className="mx-auto mb-4 w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center">
              {failed ? (
                <AlertCircle className="h-8 w-8 text-red-400" />
              ) : (
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                {failed ? 'Payment received — setup issue' : 'Payment successful'}
              </span>
            </h1>
            <p className="text-gray-100">{headlineSub}</p>
            {showProgress && (
              <div className="mt-5 h-1.5 w-full max-w-md mx-auto rounded-full bg-gray-700/80 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-[shimmer_1.4s_ease-in-out_infinite] origin-left" />
              </div>
            )}
          </div>

          {order && (
            <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
                Server setup progress
              </h3>
              <div className="space-y-4">
                {steps.map((step) => (
                  <div key={step.id} className="flex gap-4">
                    <StepIcon state={step.state} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-medium text-white">{step.label}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {failed && order.error_message && (
                <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-left">
                  <p className="text-xs font-semibold text-red-300 uppercase tracking-wide mb-1">Details</p>
                  <p className="text-sm text-red-100/90 break-words font-mono leading-relaxed">
                    {String(order.error_message).slice(0, 600)}
                    {String(order.error_message).length > 600 ? '…' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {!order && !orderId && (
            <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
              <p className="text-gray-100">
                You don’t have any orders yet. Deploy a server from your dashboard to get started.
              </p>
            </div>
          )}

          {orderId && !order && (
            <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
              <div className="flex items-center gap-3 text-cyan-300 mb-3">
                <Loader2 className="h-6 w-6 animate-spin shrink-0" />
                <p className="text-gray-100">
                  Waiting for your order to appear in your account. This usually takes a few seconds.
                </p>
              </div>
              <p className="text-base text-gray-200 font-mono">Order ID: {orderId}</p>
            </div>
          )}

          {order && (
            <>
              <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="h-5 w-5 text-emerald-400" />
                  Server details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {order.plan_name && (
                    <div>
                      <span className="text-gray-200">Plan</span>
                      <p className="text-white font-medium">{order.plan_name}</p>
                    </div>
                  )}
                  {order.game && (
                    <div>
                      <span className="text-gray-200">Game</span>
                      <p className="text-white font-medium capitalize">{order.game.replace(/-/g, ' ')}</p>
                    </div>
                  )}
                  {ram && (
                    <div>
                      <span className="text-gray-200">RAM</span>
                      <p className="text-white font-medium">{ram}</p>
                    </div>
                  )}
                  {cpu && (
                    <div>
                      <span className="text-gray-200">CPU</span>
                      <p className="text-white font-medium">{cpu}</p>
                    </div>
                  )}
                  {disk && (
                    <div>
                      <span className="text-gray-200">Storage</span>
                      <p className="text-white font-medium">{disk}</p>
                    </div>
                  )}
                  {order.region && (
                    <div>
                      <span className="text-gray-200">Region</span>
                      <p className="text-white font-medium">
                        {order.region === 'us-central' || order.region === 'us-east' ? 'US East' : order.region}
                      </p>
                    </div>
                  )}
                  {order.server_name && (
                    <div className="col-span-2">
                      <span className="text-gray-200">Server name</span>
                      <p className="text-white font-medium">{order.server_name}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel-strong rounded-xl p-6 border border-gray-600/50">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-400" />
                  Order information
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-200 shrink-0">Order ID</span>
                    <span className="text-white font-mono text-right break-all">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-200">Status</span>
                    <span
                      className={
                        failed
                          ? 'text-red-400 font-medium capitalize'
                          : 'text-emerald-400 font-medium capitalize'
                      }
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-200">Date</span>
                    <span className="text-white">
                      {new Date(order.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {Number(amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-200">Amount</span>
                      <span className="text-white font-semibold">${Number(amount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="glass-panel-strong rounded-xl p-6 border border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-emerald-300 font-semibold mb-2">What&apos;s next?</h3>
            <ul className="text-base text-gray-100 space-y-1">
              <li>• Watch the steps above until they all show complete.</li>
              <li>• Use your dashboard for connection info and the game panel link.</li>
              <li>• First boot can take several minutes while the game downloads.</li>
              <li>• Contact support if setup stays on one step for a long time or shows an error.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0" asChild>
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

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

export default Success;

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Server, ExternalLink, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '@/lib/api';

interface PurchaseData {
  id: string;
  plan_name: string;
  amount: number;
  created_at: string;
  pterodactyl_url?: string;
}

const PurchaseSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user } = useAuth();
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchaseData = async () => {
      if (!user) {
        setPurchaseData(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch the latest purchase for this user
        const ordersResponse = await api.getOrders();
        
        if (!ordersResponse || !ordersResponse.orders) {
          console.error('No orders found');
          setLoading(false);
          return;
        }

        const orders = ordersResponse.orders;
        if (orders && orders.length > 0) {
          const latestOrder = orders[0];
          
          // Get servers to find pterodactyl URL
          const serversResponse = await api.getServers();
          const servers = serversResponse?.servers || [];

          setPurchaseData({
            id: latestOrder.id,
            plan_name: latestOrder.plan_id || 'Game Server',
            amount: latestOrder.amount || 0,
            created_at: latestOrder.created_at,
            pterodactyl_url: servers[0]?.pterodactyl_url
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch purchase data:', error);
        setLoading(false);
      }
    };

    fetchPurchaseData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-blue-900/20" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Thank you for your purchase</h1>
            <p className="text-gray-300 mb-6">Sign in to view your order details and manage your server.</p>
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="inline-flex justify-center items-center bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Sign in
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex justify-center items-center border border-gray-500 text-gray-200 hover:bg-gray-700/50 px-6 py-3 rounded-lg font-semibold"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-blue-900/20"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Payment Successful!
              </span>
            </h1>
            <p className="text-xl text-gray-300">Your server is being set up and will be ready shortly.</p>
          </div>

          {purchaseData && (
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Order Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">Server Plan</h3>
                  <p className="text-white text-xl">{purchaseData.plan_name}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">Amount Paid</h3>
                  <p className="text-white text-xl">${Number(purchaseData.amount).toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">Order ID</h3>
                  <p className="text-white font-mono">{purchaseData.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">Purchase Date</h3>
                  <p className="text-white">{new Date(purchaseData.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link
              to="/dashboard/services"
              className="flex items-center justify-between p-6 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition-all group"
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2">View My Servers</h3>
                <p className="text-gray-300">Manage and monitor your game servers</p>
              </div>
              <ArrowRight size={24} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            {purchaseData?.pterodactyl_url && (
              <a
                href={purchaseData.pterodactyl_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-6 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-all group"
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Game Panel</h3>
                  <p className="text-gray-300">Access your server control panel</p>
                </div>
                <ExternalLink size={24} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
              </a>
            )}
          </div>

          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">What's Next?</h3>
            <div className="space-y-3 text-gray-300">
              <p>• <strong>Server Provisioning:</strong> Your server is being automatically provisioned and will be ready within 3-5 minutes. You can monitor progress in your dashboard.</p>
              <p>• <strong>Access Control Panel:</strong> Once your server is ready, access it via the "Open Panel" button in your dashboard or go directly to https://panel.givrwrldservers.com. A panel account is automatically created during signup.</p>
              <p>• <strong>Server Status:</strong> Check your dashboard to see when your server status changes from "provisioning" to "active". You'll also see connection details and server information.</p>
              <p>• <strong>Need Help?</strong> Our support team is available 24/7. If your server takes longer than 10 minutes to provision, please contact support for assistance.</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
            >
              <Server size={20} />
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default PurchaseSuccess;
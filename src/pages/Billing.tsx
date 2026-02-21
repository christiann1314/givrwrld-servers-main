import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/useUserStats';
import { useLiveBillingData } from '../hooks/useLiveBillingData';
import { 
  ArrowLeft, 
  CreditCard, 
  DollarSign, 
  Calendar,
  Download,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

const Billing = () => {
  const { user } = useAuth();
  const { userStats } = useUserStats();
  const { data: billingData, loading: billingLoading, error: billingError } = useLiveBillingData();

  // Use real data from hook, fallback to empty arrays if loading or error
  const invoices = billingData?.upcomingInvoices || [];
  const payments = billingData?.recentPayments || [];
  
  // Payment methods - TODO: Implement real payment method fetching from payment provider
  const paymentMethods: Array<{
    id: string;
    type: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  }> = [];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-blue-900/10"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Billing & Payments
              </span>
            </h1>
            <p className="text-gray-300">Manage your payments, invoices, and billing information</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Billing Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Balance */}
              <div className="glass-panel-strong rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <DollarSign className="mr-3 text-emerald-400" size={24} />
                  Current Balance
                </h2>
                <div className="text-3xl font-bold text-white mb-2">
                  ${billingData?.totalRevenue ? billingData.totalRevenue.toFixed(2) : '0.00'}
                </div>
                <p className="text-gray-400">
                  {billingError ? 'Error loading billing data' : billingLoading ? 'Loading...' : 'Total revenue'}
                </p>
              </div>

              {/* Recent Invoices */}
              <div className="glass-panel-strong rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Calendar className="mr-3 text-emerald-400" size={24} />
                    Recent Invoices
                  </h2>
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
                    <Download className="mr-2" size={16} />
                    Download All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {billingLoading && (
                    <div className="text-center text-gray-400 py-8">Loading invoices...</div>
                  )}
                  {billingError && (
                    <div className="text-center text-red-400 py-8">
                      <AlertCircle className="mx-auto mb-2" size={24} />
                      Error loading invoices: {billingError}
                    </div>
                  )}
                  {!billingLoading && !billingError && invoices.length === 0 && (
                    <div className="text-center text-gray-400 py-8">No invoices found</div>
                  )}
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {invoice.status === 'paid' ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <div className="text-white font-medium">{invoice.description}</div>
                          <div className="text-gray-400 text-sm">Invoice #{invoice.id} • {new Date(invoice.dueDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-white font-bold">${invoice.amount.toFixed(2)}</div>
                          <div className={`text-sm ${
                            invoice.status === 'paid' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {invoice.status.toUpperCase()}
                          </div>
                        </div>
                        <button className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg transition-colors">
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Methods */}
              <div className="glass-panel-strong rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Payment Methods</h3>
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center">
                    <Plus size={16} className="mr-1" />
                    Add
                  </button>
                </div>
                
                <div className="space-y-3">
                  {paymentMethods.length === 0 && (
                    <div className="text-center text-gray-400 py-4">No payment methods on file</div>
                  )}
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="text-blue-400" size={20} />
                        <div>
                          <div className="text-white font-medium">{method.brand} •••• {method.last4}</div>
                          <div className="text-gray-400 text-sm">Expires {method.expiryMonth}/{method.expiryYear}</div>
                        </div>
                      </div>
                      {method.isDefault && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs">
                          Default
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Information */}
              <div className="glass-panel-strong rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Billing Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Email</label>
                    <div className="text-white">{user?.email}</div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Total Spent</label>
                    <div className="text-white font-bold">${billingData?.totalRevenue ? billingData.totalRevenue.toFixed(2) : userStats?.totalSpent || '0.00'}</div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Monthly Revenue</label>
                    <div className="text-white">${billingData?.monthlyRevenue ? billingData.monthlyRevenue.toFixed(2) : '0.00'}</div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Active Subscriptions</label>
                    <div className="text-white">{billingData?.activeSubscriptions || 0}</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel-strong rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-left">
                    Update Payment Method
                  </button>
                  <button className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors text-left">
                    Download Tax Documents
                  </button>
                  <button className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors text-left">
                    Contact Billing Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default Billing;

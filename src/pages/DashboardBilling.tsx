
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { useBillingData } from '../hooks/useBillingData';
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Download,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const DashboardBilling = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { billingData } = useBillingData(user?.email);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/20 text-emerald-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const stats = [
    { label: "Current Balance", value: billingData.stats.currentBalance, icon: DollarSign },
    { label: "Next Payment", value: billingData.stats.nextPayment, icon: Calendar },
    { label: "This Month", value: billingData.stats.thisMonth, icon: CreditCard },
    { label: "Payment Methods", value: billingData.stats.paymentMethods, icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/55 via-gray-900/35 to-gray-900/65"></div>
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
            <p className="text-gray-300">Manage your payment methods and billing history</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="text-emerald-400" size={24} />
                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                </div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
            <div className="flex space-x-6 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('methods')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'methods'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Payment Methods
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Billing History
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Upcoming Bills */}
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Upcoming Bills</h2>
                  <div className="space-y-4">
                    {billingData.upcomingBills.length === 0 && (
                      <div className="text-gray-400 text-sm">No upcoming bills yet.</div>
                    )}
                    {billingData.upcomingBills.map((bill, index) => (
                      <div key={index} className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-medium">{bill.service}</h3>
                          <span className="text-xl font-bold text-white">{bill.amount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Due: {bill.dueDate}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {bill.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account Balance */}
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Account Balance</h2>
                  <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-2">{billingData.stats.currentBalance}</div>
                    <div className="text-gray-300 mb-4">Available Credit</div>
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors">
                      Add Funds
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'methods' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Payment Methods</h2>
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
                    <Plus size={16} className="mr-2" />
                    Add Method
                  </button>
                </div>
                
                <div className="space-y-4">
                  {billingData.paymentMethods.length === 0 && (
                    <div className="text-gray-400 text-sm">No payment methods found yet.</div>
                  )}
                  {billingData.paymentMethods.map((method) => (
                    <div key={method.id} className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-8 bg-gray-600 rounded flex items-center justify-center">
                            <CreditCard size={16} className="text-gray-300" />
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {method.brand}{method.last4 !== 'N/A' ? ` •••• ${method.last4}` : ''}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {method.type === 'paypal' ? 'Recurring subscription billing' : `Expires ${method.expiryMonth}/${method.expiryYear}`}
                            </div>
                          </div>
                          {method.isDefault && (
                            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-400 hover:text-blue-300 p-2">
                            <Edit size={16} />
                          </button>
                          <button className="text-red-400 hover:text-red-300 p-2">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Billing History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Billing History</h2>
                  <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                    Download All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {billingData.billingHistory.length === 0 && (
                    <div className="text-gray-400 text-sm">No billing history yet.</div>
                  )}
                  {billingData.billingHistory.map((bill) => (
                    <div key={bill.id} className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{bill.description}</h3>
                          <div className="text-gray-400 text-sm">
                            Invoice {bill.id} • {bill.date} • {bill.method}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">{bill.amount}</div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {bill.status === 'paid' && <CheckCircle size={12} className="mr-1" />}
                            {bill.status === 'failed' && <AlertCircle size={12} className="mr-1" />}
                            {bill.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center">
                          <Download size={16} className="mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default DashboardBilling;

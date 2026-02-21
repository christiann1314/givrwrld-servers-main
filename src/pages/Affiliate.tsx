
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { DollarSign, Users, TrendingUp, Gift, CheckCircle, Copy } from 'lucide-react';

const Affiliate = () => {
  const [referralCode, setReferralCode] = useState('GIVRWRLD-AFFILIATE-2024');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn 25% Commission",
      description: "Get 25% of every sale you refer for the first 12 months"
    },
    {
      icon: Users,
      title: "Lifetime Commissions",
      description: "Continue earning from your referrals for as long as they remain customers"
    },
    {
      icon: TrendingUp,
      title: "Performance Bonuses",
      description: "Unlock additional bonuses based on your monthly performance"
    },
    {
      icon: Gift,
      title: "Exclusive Rewards",
      description: "Access to special promotions and exclusive affiliate-only rewards"
    }
  ];

  const stats = [
    { label: "Average Monthly Earnings", value: "$2,500" },
    { label: "Top Affiliate Earnings", value: "$15,000" },
    { label: "Commission Rate", value: "25%" },
    { label: "Cookie Duration", value: "90 days" }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
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
        
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Affiliate Program
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Join our affiliate program and earn generous commissions by referring customers to GIVRwrld Servers.
            </p>
            <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 text-lg">
              Join Affiliate Program
            </button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-2">{stat.value}</div>
                <div className="text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Why Join Our Affiliate Program?
              </span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                  <benefit.icon className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                  <p className="text-gray-300">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-emerald-400">1</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Sign Up</h3>
                <p className="text-gray-300">Join our affiliate program and get your unique referral link</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-400">2</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Promote</h3>
                <p className="text-gray-300">Share your link with your audience and network</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-400">3</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Earn</h3>
                <p className="text-gray-300">Receive 25% commission on every successful referral</p>
              </div>
            </div>
          </div>

          {/* Referral Code */}
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Your Referral Code</h2>
            <div className="flex items-center justify-center space-x-4">
              <div className="bg-gray-700/50 px-6 py-3 rounded-lg font-mono text-emerald-400">
                {referralCode}
              </div>
              <button
                onClick={copyToClipboard}
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-lg transition-colors"
              >
                <Copy size={20} />
              </button>
            </div>
            <p className="text-gray-400 mt-4">Share this code with your referrals to earn commissions</p>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Affiliate;

import React from 'react';
import { DollarSign, Users, TrendingUp, Gift } from 'lucide-react';
import {
  AFFILIATE,
  AFFILIATE_TIERS,
  affiliateCommissionPercent,
  affiliatePerformanceCommissionPercent,
  affiliateCommissionMonthsCap,
  affiliateMinPayout,
  affiliateCookieDays,
  affiliatePercentFromRate,
} from '@/config/affiliate';

const Affiliate = () => {
  const tiers = AFFILIATE_TIERS;

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
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-amber-400 bg-clip-text text-transparent">
                Make Money With GIVRwrld
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Earn recurring commissions by referring creators and communities to GIVRwrld Servers. 
              Our three‑tier structure, welcome bonus, and clear payout rules are designed to reward long‑term partners.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 text-base md:text-lg">
                Join the Affiliate Program
              </button>
              <button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold py-3 px-8 rounded-lg transition-all duration-300 text-base md:text-lg">
                Apply for Special Partner
              </button>
            </div>
          </div>

          {/* Highlight cards */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-10">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Program Highlights
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-4">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">${AFFILIATE.welcomeBonusUsd} welcome bonus</h3>
                <p className="text-gray-300 text-sm">
                  Start with a one‑time ${AFFILIATE.welcomeBonusUsd} bonus credit when your first referred customer activates a paid server.
                </p>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Valuable rewards</h3>
                <p className="text-gray-300 text-sm">
                  Earn recurring commissions for the first {affiliateCommissionMonthsCap()} months of each qualifying subscription, plus opportunities for store credit.
                </p>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Exclusive roles & perks</h3>
                <p className="text-gray-300 text-sm">
                  Unlock priority affiliate support and Discord roles as you grow, with access to upcoming promos and beta features.
                </p>
              </div>
            </div>
            <p className="text-center text-gray-400 text-sm">
              Cookie duration: {affiliateCookieDays()} days · Minimum payout: {affiliateMinPayout()} · Payouts: {AFFILIATE.paymentSchedule}
            </p>
          </div>

          {/* Tiers (3‑tier structure shared with dashboard) */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-10">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Affiliate Program Tiers
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`bg-gray-800/60 backdrop-blur-md border rounded-xl p-6 text-center ${
                    tier.highlight
                      ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/20'
                      : 'border-gray-600/30'
                  }`}
                >
                  <div className="text-sm uppercase tracking-wide text-gray-400 mb-2">
                    {tier.minReferrals}+ referrals
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 mb-2">
                    {affiliatePercentFromRate(tier.commissionRate)}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{tier.name}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{tier.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Program Highlights */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Why Promote GIVRwrld?
              </span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <DollarSign className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Recurring revenue</h3>
                <p className="text-gray-300">
                  Earn commission on recurring subscription payments for the first {affiliateCommissionMonthsCap()} months.
                </p>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <Users className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Creator‑friendly</h3>
                <p className="text-gray-300">
                  Perfect for streamers, community owners, and content creators who want a simple, reliable host to recommend.
                </p>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <TrendingUp className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Performance rewards</h3>
                <p className="text-gray-300">
                  Hit {affiliateCookieDays()}‑day milestones and unlock higher tiers and potential custom deals.
                </p>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <Gift className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Clear payouts</h3>
                <p className="text-gray-300">
                  Minimum payout {affiliateMinPayout()}, paid {AFFILIATE.paymentSchedule.toLowerCase()}. No hidden caps per sale.
                </p>
              </div>
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
                <p className="text-gray-300">Receive {affiliateCommissionPercent()} commission on every qualifying referral payment (first {affiliateCommissionMonthsCap()} months)</p>
              </div>
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Affiliate;

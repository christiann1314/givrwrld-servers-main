import React from 'react';
import { Link } from 'react-router-dom';
import { Server, Shield, Zap, HeadphonesIcon, CreditCard } from 'lucide-react';

const About = () => {
  const differentiators = [
    {
      icon: Zap,
      title: 'Instant provisioning',
      description: 'Servers are provisioned automatically within minutes of payment. No manual tickets, no waiting—your game is live when you are.',
    },
    {
      icon: Server,
      title: 'Dedicated game infrastructure',
      description: 'We run game-optimized nodes with NVMe storage and low-latency networking. One region at launch (US East) so we do it right before we expand.',
    },
    {
      icon: Shield,
      title: 'Transparent pricing and SLA',
      description: 'No hidden fees. You see the full price before checkout. We target 99.9% uptime and back it with clear terms and support.',
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 support',
      description: 'Reach us via our help center or Discord. Technical and billing support so you can focus on your community, not on infrastructure.',
    },
    {
      icon: CreditCard,
      title: 'PayPal subscriptions',
      description: 'Pay monthly, quarterly, or annually with PayPal. Manage renewals and billing in one place—no surprise charges.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/48 via-gray-900/30 to-gray-900/56" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8" />
      </div>

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Hero */}
          <div className="text-center mb-20">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white tracking-tight">
              About GIVRwrld Servers
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
              GIVRwrld Servers provides premium, one-click game server hosting for communities and creators. 
              We focus on reliability, transparent pricing, and a single dashboard so you can run Minecraft, Rust, Palworld, and other titles without managing VPS or panels yourself.
            </p>
          </div>

          {/* Mission */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-600/50 pb-2">
              Our focus
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We built GIVRwrld to sit between generic VPS hosting and opaque game-hosting brands. You get dedicated game infrastructure, automatic provisioning, and one clear bill—no surprise overages or locked-in annual contracts you did not choose. We launch with US East; we add regions when we can deliver the same standards.
            </p>
          </div>

          {/* Why choose us */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-8 border-b border-gray-600/50 pb-2">
              Why choose GIVRwrld
            </h2>
            <div className="space-y-6">
              {differentiators.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Who we serve */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-600/50 pb-2">
              Who we serve
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Our customers include content creators, community admins, and gaming groups who want a reliable host with clear pricing and real support. We do not overpromise features we have not shipped; we focus on game server hosting done well.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['Content creators', 'Community admins', 'Gaming groups', 'Streamers', 'Modded servers', 'Roleplay communities'].map((label) => (
                <div
                  key={label}
                  className="bg-gray-800/40 border border-gray-600/30 rounded-lg px-4 py-3 text-center text-gray-300 text-sm font-medium"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
            <h2 className="text-xl font-semibold text-white mb-3">Ready to deploy?</h2>
            <p className="text-gray-300 text-sm mb-6 max-w-md mx-auto">
              Choose your game, select a plan, and go live in minutes. No long-term lock-in; cancel or change plans from your dashboard.
            </p>
            <Link
              to="/deploy"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors border border-emerald-500/30"
            >
              Deploy your server
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

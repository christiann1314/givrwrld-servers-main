
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Headphones, Zap, LayoutDashboard, Clapperboard } from 'lucide-react';

const FeaturesSection = () => {
  const serviceFeatures = [
    {
      icon: Shield,
      title: 'DDoS Protection',
      description: 'Enterprise-grade protection keeps your server safe from attacks 24/7.',
    },
    {
      icon: Headphones,
      title: '24/7 Expert Support',
      description: 'Our gaming experts are always available to help with any issues or questions.',
    },
    {
      icon: Zap,
      title: '99.9% Uptime',
      description: 'Guaranteed uptime with redundant systems and automatic failover protection.',
    },
    {
      icon: LayoutDashboard,
      title: 'Game server panel',
      description:
        'Start, stop, and restart from one place — live console, file manager, and server details without juggling SSH or raw VPS tools.',
    },
    {
      icon: Clapperboard,
      title: 'Stream Station',
      description:
        'Clip long sessions, prep verticals for Shorts and Reels, and line up publishing — a creator workspace alongside your hosting.',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16 flex justify-center">
        <div className="inline-block rounded-2xl border border-gray-800/80 bg-black/55 backdrop-blur-sm px-6 sm:px-10 py-6">
          <h2 className="text-4xl lg:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-100 max-w-2xl">
            Everything you need for premium gaming experiences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {serviceFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-gray-800/90 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10"
            >
              <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <Icon size={32} className="text-emerald-400" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-100 text-base leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">
          Ready to start your gaming server?
        </h3>
        <p className="text-gray-100 text-base mb-8 max-w-2xl mx-auto">
          Launch your custom game server in minutes with our simple setup process.
          High performance, low latency, and 24/7 support included.
        </p>
        <Link to="/deploy" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 inline-block">
          Start Your Server
        </Link>
      </div>
    </section>
  );
};

export default FeaturesSection;

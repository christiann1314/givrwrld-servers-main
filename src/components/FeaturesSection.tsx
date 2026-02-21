
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Headphones, Zap, Package, Gamepad2, Users } from 'lucide-react';

const FeaturesSection = () => {
  const serviceFeatures = [
    {
      icon: Shield,
      title: "DDoS Protection",
      description: "Enterprise-grade protection keeps your server safe from attacks 24/7."
    },
    {
      icon: Headphones,
      title: "24/7 Expert Support",
      description: "Our gaming experts are always available to help with any issues or questions."
    },
    {
      icon: Zap,
      title: "99.9% Uptime",
      description: "Guaranteed uptime with redundant systems and automatic failover protection."
    }
  ];

  const productFeatures = [
    {
      icon: Package,
      title: "GIVRwrld Essentials",
      description: "Complete server management toolkit with daily automatic backups, Discord bridge integration, and analytics dashboard.",
      price: "$6.99"
    },
    {
      icon: Gamepad2,
      title: "Game Expansion Pack",
      description: "Cross-deploy to multiple game types with shared resource allocation and cross-game player management.",
      price: "$14.99"
    },
    {
      icon: Users,
      title: "Community Pack",
      description: "Connect with creators and get exclusive access to creator spotlights, dev blog access, and priority support.",
      price: "$4.99"
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Features Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Features
          </span>
        </h2>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Everything you need for premium gaming experiences
        </p>
      </div>

      {/* Service Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-20">
        {serviceFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10">
              <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <Icon size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Product Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {productFeatures.map((product, index) => {
          const Icon = product.icon;
          return (
            <div key={index} className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10">
              <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <Icon size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{product.title}</h3>
              <p className="text-gray-400 leading-relaxed mb-6">{product.description}</p>
              <div className="text-2xl font-bold text-emerald-400">{product.price}</div>
            </div>
          );
        })}
      </div>

      {/* Call to Action */}
      <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">
          Ready to start your gaming server?
        </h3>
        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
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


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UpgradePaymentModal from '../components/UpgradePaymentModal';
import { Button } from '../components/ui/button';
import { Check, Zap, Shield, Server, ArrowLeft } from 'lucide-react';

const GivrwrldEssentials = () => {
  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const features = [
    {
      icon: <Server className="w-6 h-6" />,
      title: "Enhanced Performance",
      description: "Premium server resources and optimization"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Advanced Security", 
      description: "Enhanced protection and monitoring"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Priority Support",
      description: "Fast-track support and assistance"
    }
  ];

  const benefits = [
    "Enhanced server performance",
    "Advanced DDoS protection", 
    "Priority customer support",
    "Extended backup retention",
    "Custom server configurations",
    "Advanced monitoring tools",
    "Dedicated IP addresses",
    "Premium bandwidth allocation"
  ];

  const packageData = {
    name: 'GIVRwrld Essentials',
    price: '$14.99/mo',
    features: benefits
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Sword Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/55 via-gray-900/35 to-gray-900/65"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-cyan-900/10"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <button 
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors mb-6"
            >
              <ArrowLeft className="mr-2" size={20} />
              Back
            </button>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
              <Server className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                GIVRwrld Essentials
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Everything you need for premium server hosting experience
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 mb-12">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-white mb-2">
                  $14.99
                  <span className="text-lg font-normal text-gray-400 ml-2">/month</span>
                </div>
                <div className="text-emerald-400 font-semibold mb-4">Essential Package</div>
                <p className="text-gray-300">Enhanced features for serious server administrators</p>
              </div>

              {/* Feature Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="text-center p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-emerald-400 mb-3 flex justify-center">
                      {feature.icon}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-300 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* Benefits List */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4">Package Benefits:</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center text-gray-300 text-sm">
                      <Check size={16} className="text-emerald-400 mr-3 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-4 px-8 text-lg"
                >
                  Upgrade to Essentials for $14.99/mo
                </Button>
              </div>
            </div>

            {/* Why Upgrade Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Enhanced Performance</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Get access to premium server resources with enhanced performance and reliability.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Priority resource allocation</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Enhanced monitoring</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Premium Support</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Priority support with faster response times and dedicated assistance.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Priority support queue</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Extended support hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        
      </div>

      <UpgradePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        packageData={packageData}
      />
    </div>
  );
};

export default GivrwrldEssentials;

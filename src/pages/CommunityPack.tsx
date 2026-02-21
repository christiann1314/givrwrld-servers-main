import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UpgradePaymentModal from '../components/UpgradePaymentModal';
import { Button } from '../components/ui/button';
import { Check, Users, Star, Heart, ArrowLeft } from 'lucide-react';

const CommunityPack = () => {
  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const features = [
    {
      icon: <Star className="w-6 h-6" />,
      title: "Creator Credits",
      description: "Recognition and rewards for community contributions"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Blog Access", 
      description: "Exclusive access to community blog and updates"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Priority Support",
      description: "Fast-track support and community assistance"
    }
  ];

  const benefits = [
    "Creator credit system",
    "Early access to new features", 
    "Community blog publishing rights",
    "Priority support queue",
    "Exclusive community events",
    "Beta testing opportunities",
    "Community showcase features",
    "Direct developer feedback channel"
  ];

  const packageData = {
    name: 'Community Pack',
    price: '$4.99/mo',
    features: benefits
  };

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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500/20 rounded-full mb-4">
              <Heart className="w-8 h-8 text-pink-400" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Community Pack
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Join the inner circle and help shape the future of GIVRwrld
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 mb-12">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-white mb-2">
                  $4.99
                  <span className="text-lg font-normal text-gray-400 ml-2">/month</span>
                </div>
                <div className="text-pink-400 font-semibold mb-4">Community Membership</div>
                <p className="text-gray-300">Be part of the GIVRwrld community and influence development</p>
              </div>

              {/* Feature Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="text-center p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-pink-400 mb-3 flex justify-center">
                      {feature.icon}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-300 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* Benefits List */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4">Community Benefits:</h3>
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
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white font-semibold py-4 px-8 text-lg"
                >
                  Join Community for $4.99/mo
                </Button>
              </div>
            </div>

            {/* Why Join Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Shape the Future</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Your feedback directly influences new features and improvements. Be part of the development process.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Feature voting rights</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Beta testing access</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Community Recognition</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Get recognition for your contributions and build your reputation within the GIVRwrld community.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Creator badge</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check size={14} className="text-emerald-400 mr-2" />
                    <span>Community showcase</span>
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

export default CommunityPack;

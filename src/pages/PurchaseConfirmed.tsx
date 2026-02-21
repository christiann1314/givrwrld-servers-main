
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Check, CheckCircle, ArrowRight, Home } from 'lucide-react';

const PurchaseConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { package: packageName, price, features } = location.state || {
    package: 'Package',
    price: '$0.00/mo',
    features: []
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
        
        
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-8">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Purchase Confirmed!
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Thank you for upgrading to <span className="text-emerald-400 font-semibold">{packageName}</span>. 
            Your server is being configured with your new features.
          </p>

          {/* Order Summary */}
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>
            
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-600/50">
              <div className="text-left">
                <h3 className="text-white font-semibold text-lg">{packageName}</h3>
                <p className="text-gray-400">Monthly subscription</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">{price}</div>
              </div>
            </div>

            {/* Features Included */}
            <div className="text-left">
              <h4 className="text-white font-semibold mb-4">Features Included:</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center text-gray-300 text-sm">
                    <Check size={16} className="text-emerald-400 mr-3 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">What's Next?</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-full mb-4">
                  <span className="text-blue-400 font-bold">1</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Server Configuration</h3>
                <p className="text-gray-300 text-sm">Your server is being updated with new features (2-5 minutes)</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-full mb-4">
                  <span className="text-purple-400 font-bold">2</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Feature Activation</h3>
                <p className="text-gray-300 text-sm">All your new features will be active within 10 minutes</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-4">
                  <span className="text-emerald-400 font-bold">3</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Start Using</h3>
                <p className="text-gray-300 text-sm">Check your dashboard to access all new tools and features</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-8"
            >
              <Home className="mr-2" size={20} />
              Return to Dashboard
            </Button>
            <Button
              onClick={() => navigate('/support')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3 px-8"
            >
              Contact Support
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>

          {/* Support Notice */}
          <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Need help?</strong> Our support team is available 24/7 to assist with your new features. 
              Check your email for a detailed setup guide and welcome information.
            </p>
          </div>
        </section>

        
      </div>
    </div>
  );
};

export default PurchaseConfirmed;


import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const Refund = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-emerald-900/20"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Refund Policy
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Our straightforward refund policy to ensure customer satisfaction and service quality.
            </p>
          </div>

          {/* 48-Hour Satisfaction Guarantee */}
          <div className="mb-16">
            <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-8 mb-8">
              <div className="flex items-center justify-center mb-6">
                <CheckCircle className="w-12 h-12 text-emerald-400 mr-4" />
                <h2 className="text-3xl font-bold text-emerald-400">48-Hour Satisfaction Guarantee</h2>
              </div>
              <p className="text-gray-300 text-lg text-center max-w-4xl mx-auto">
                We stand behind our service quality. If you're not completely satisfied with your GIVRwrld server within the first 48 hours of activation, we'll provide a full refund, no questions asked.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-emerald-400 font-semibold mb-2">✓ Easy to request</div>
                  <p className="text-gray-300 text-sm">Simply contact our support team within 48 hours</p>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-semibold mb-2">✓ No questions asked</div>
                  <p className="text-gray-300 text-sm">We won't ask for detailed explanations or reasons</p>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-semibold mb-2">✓ Full refund guaranteed</div>
                  <p className="text-gray-300 text-sm">100% of your payment will be returned within 5-7 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Credit for Downtime */}
          <div className="mb-16">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
              <div className="flex items-center mb-6">
                <Clock className="w-8 h-8 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-blue-400">Service Credit for Downtime</h2>
              </div>
              
              <p className="text-gray-300 mb-6">
                If your server experiences unplanned downtime that exceeds our SLA commitments, you're automatically eligible for service credits applied to your next billing cycle.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Automatic Credits Apply For:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Server outages due to our infrastructure issues</li>
                    <li>• Network connectivity problems on our end</li>
                    <li>• Hardware failures affecting your server</li>
                    <li>• Scheduled maintenance that exceeds announced windows</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Credit Amount:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Less than 99.5% uptime: 10% monthly fee credit</li>
                    <li>• Less than 99% uptime: 25% monthly fee credit</li>
                    <li>• Less than 95% uptime: 50% monthly fee credit</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Ineligible Refunds */}
          <div className="mb-16">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
              <div className="flex items-center mb-6">
                <AlertTriangle className="w-8 h-8 text-orange-400 mr-3" />
                <h2 className="text-2xl font-bold text-orange-400">Ineligible Refunds</h2>
              </div>
              
              <p className="text-gray-300 mb-6">
                The following circumstances are not eligible for refunds:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <ul className="space-y-3 text-gray-300">
                    <li>• Requests made after the 48-hour guarantee period</li>
                    <li>• Issues caused by third-party modifications or plugins</li>
                    <li>• Problems resulting from user configuration errors</li>
                    <li>• Downtime due to scheduled maintenance (with proper notice)</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-3 text-gray-300">
                    <li>• Server issues caused by excessive resource usage</li>
                    <li>• Account suspensions due to Terms of Service violations</li>
                    <li>• Refund requests based on changes in gaming preferences</li>
                    <li>• Issues with game-specific bugs not related to hosting</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-orange-200 text-sm">
                  <strong>Note:</strong> We may consider exceptions to these policies on a case-by-case basis for extraordinary circumstances. Please contact our support team to discuss your specific situation.
                </p>
              </div>
            </div>
          </div>

          {/* Prorated Services and Automatic Renewals */}
          <div className="mb-16">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Prorated Services and Automatic Renewals</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Service Cancellation:</h3>
                  <p className="text-gray-300 mb-4">
                    You can cancel your service at any time through your account dashboard. Cancellations take effect at the end of your current billing cycle.
                  </p>
                  <ul className="space-y-2 text-gray-300">
                    <li>• No refunds for partial month usage after 48-hour period</li>
                    <li>• Access continues until end of paid period</li>
                    <li>• Data backup available for 30 days post-cancellation</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Annual Plans:</h3>
                  <p className="text-gray-300 mb-4">
                    Annual subscriptions offer significant savings but have different refund terms:
                  </p>
                  <ul className="space-y-2 text-gray-300">
                    <li>• 48-hour satisfaction guarantee still applies</li>
                    <li>• After 48 hours, no refunds for unused portion</li>
                    <li>• Service credits may still apply for SLA violations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* How to Request a Refund */}
          <div className="text-center bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">How to Request a Refund</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              To request a refund within our 48-hour satisfaction guarantee period:
            </p>
            
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl mb-2">1️⃣</div>
                <p className="text-sm text-gray-300">Log in to your GIVRwrld dashboard</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl mb-2">2️⃣</div>
                <p className="text-sm text-gray-300">Open a "Billing Support" ticket</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl mb-2">3️⃣</div>
                <p className="text-sm text-gray-300">Select "Refund Request" as the reason</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl mb-2">4️⃣</div>
                <p className="text-sm text-gray-300">Receive confirmation within 24 hours</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              <p><strong>Alternative:</strong> Email us directly at billing@givrwrld.com with your server details and refund request.</p>
              <p className="mt-2">Refunds are typically processed within 5-7 business days and will appear on the original payment method.</p>
            </div>
          </div>

          {/* Policy Updates */}
          <div className="mt-16">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Policy Updates</h3>
              <p className="text-gray-400 text-sm">
                GIVRwrld reserves the right to update this refund policy with reasonable notice to customers. 
                Current customers will be grandfathered under the policy terms in effect when they subscribed.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                If you have questions about this policy, please contact our support team.
              </p>
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Refund;

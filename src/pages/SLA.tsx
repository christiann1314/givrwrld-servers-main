
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SLA = () => {
  const serviceAvailability = [
    { tier: "Standard", guaranteed_uptime: "99.5%", maximum_downtime: "3 hours, 36 minutes" },
    { tier: "Professional", guaranteed_uptime: "99.9%", maximum_downtime: "43 minutes" },
    { tier: "Enterprise", guaranteed_uptime: "99.95%", maximum_downtime: "21 minutes" }
  ];

  const supportResponseTimes = [
    { priority: "Critical", response_standard: "< 1 hour", response_professional: "< 30 minutes", response_enterprise: "< 15 minutes" },
    { priority: "High", response_standard: "< 4 hours", response_professional: "< 2 hours", response_enterprise: "< 1 hour" },
    { priority: "Medium", response_standard: "< 24 hours", response_professional: "< 8 hours", response_enterprise: "< 4 hours" },
    { priority: "Low", response_standard: "< 48 hours", response_professional: "< 24 hours", response_enterprise: "< 8 hours" }
  ];

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
                Service Level Agreement
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Our commitment to providing reliable, high-quality game server hosting with guaranteed uptime and support response times.
            </p>
          </div>

          {/* Service Availability */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Service Availability</h2>
            <p className="text-gray-300 text-center mb-8 max-w-4xl mx-auto">
              GIVRwrld commits to the following uptime guarantees for our hosted game servers, with service credits issued for any unplanned outages that fall below these thresholds.
            </p>
            
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600/30">
                    <TableHead className="text-gray-300 font-semibold">Service Tier</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Guaranteed Uptime</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Maximum Monthly Downtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceAvailability.map((tier, index) => (
                    <TableRow key={index} className="border-gray-600/30">
                      <TableCell className="text-white font-medium">{tier.tier}</TableCell>
                      <TableCell className="text-emerald-400 font-semibold">{tier.guaranteed_uptime}</TableCell>
                      <TableCell className="text-gray-300">{tier.maximum_downtime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Network Performance */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Network Performance</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
                <h3 className="text-xl font-bold text-emerald-400 mb-4">Performance Guarantees</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">Network availability of 99.9% or higher</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">Average latency of 150ms for same continent players</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">Packet loss under 0.1% during normal operations</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">DDoS protection and mitigation for all servers</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
                <h3 className="text-xl font-bold text-blue-400 mb-4">Monitoring & Reporting</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">24/7 network monitoring and alerting</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">Real-time performance dashboards</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">Monthly uptime and performance reports</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span className="text-gray-200">Proactive notification of maintenance windows</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Credit Policy */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Service Credit Policy</h2>
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
              <p className="text-gray-300 mb-6">
                If GIVRwrld fails to meet the guaranteed uptime levels, we will provide service credits according to the following schedule:
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-2">Less than 99.5% uptime</div>
                  <p className="text-gray-300">10% service credit</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400 mb-2">Less than 99% uptime</div>
                  <p className="text-gray-300">25% service credit</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500 mb-2">Less than 95% uptime</div>
                  <p className="text-gray-300">50% service credit</p>
                </div>
              </div>
              
              <div className="mt-8 text-sm text-gray-400">
                <p>Service credits must be requested within 30 days of the incident. Credits are applied to your next billing cycle and cannot exceed 100% of your monthly service fee.</p>
              </div>
            </div>
          </div>

          {/* Support Response Times */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Support Response Times</h2>
            <p className="text-gray-300 text-center mb-8 max-w-4xl mx-auto">
              Our support team is available 24/7 for resolving technical issues. Response times vary by subscription tier and incident priority level.
            </p>
            
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600/30">
                    <TableHead className="text-gray-300 font-semibold">Priority Level</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Standard Plan</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Professional Plan</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Enterprise Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportResponseTimes.map((item, index) => (
                    <TableRow key={index} className="border-gray-600/30">
                      <TableCell className="text-white font-medium">{item.priority}</TableCell>
                      <TableCell className="text-gray-300">{item.response_standard}</TableCell>
                      <TableCell className="text-blue-400">{item.response_professional}</TableCell>
                      <TableCell className="text-emerald-400">{item.response_enterprise}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* SLA Updates */}
          <div className="text-center bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">SLA Updates</h2>
            <p className="text-gray-300 mb-4 max-w-2xl mx-auto">
              We reserve the right to update this SLA with 30 days written notice. Any updates regarding SLA commitments or service credits will be clearly communicated to all customers through our official channels.
            </p>
            <p className="text-sm text-gray-400">
              For questions regarding SLA compliance or to request service credits, contact our support team at sla@givrwrld.com
            </p>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default SLA;

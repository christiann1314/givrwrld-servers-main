
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Status = () => {
  const serverStatus = [
    { region: "US East 1", status: "Operational", latency: "12ms", uptime: "99.99%" },
    { region: "US West (California)", status: "Operational", latency: "8ms", uptime: "99.97%" }
  ];

  const recentIncidents = [
    {
      title: "API Rate Limiting Resolved",
      date: "Nov 15, 2024",
      status: "Resolved",
      description: "We have successfully resolved an issue that was causing API requests to be rate limited. The issue was identified and resolved within 23 minutes."
    },
    {
      title: "Network Connectivity in Asia Region",
      date: "Nov 12, 2024", 
      status: "Resolved",
      description: "Some users experienced connectivity issues connecting to servers hosted in the Asia region. Network routing optimizations have been deployed to improve performance."
    },
    {
      title: "Database Performance Degradation",
      date: "Nov 8, 2024",
      status: "Resolved", 
      description: "Database performance was impacted during scheduled maintenance. All systems returned to normal performance within 45 minutes."
    }
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
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-emerald-900/20"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                GIVRwrld Service Status
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Check GIVRwrld server status, view GIVRwrld outages and infrastructure reports.
            </p>
            
            {/* All Systems Status */}
            <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400">🟢 All Systems Operational</h2>
                  <p className="text-gray-300">Last updated: November 20th, 12:45 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Server Status Table */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Server Status</h2>
            
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600/30">
                    <TableHead className="text-gray-300 font-semibold">Region</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Latency</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Uptime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serverStatus.map((server, index) => (
                    <TableRow key={index} className="border-gray-600/30">
                      <TableCell className="text-white font-medium">{server.region}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                          <span className="text-emerald-400">{server.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{server.latency}</TableCell>
                      <TableCell className="text-gray-300">{server.uptime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Recent Incidents */}
          <div>
            <h2 className="text-3xl font-bold text-center mb-8">Recent Incidents</h2>
            
            <div className="space-y-6">
              {recentIncidents.map((incident, index) => (
                <div key={index} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">{incident.title}</h3>
                      <p className="text-gray-400 text-sm">{incident.date}</p>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" />
                      <span className="text-emerald-400 font-medium">{incident.status}</span>
                    </div>
                  </div>
                  <p className="text-gray-300">{incident.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Status;

import * as React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Cpu, HardDrive, Clock, Zap, Shield, Headphones, Star } from 'lucide-react';

const VPS = () => {
  const plans = [
    {
      name: "Starter",
      price: "$9.50/mo",
      cpu: "2x vCPU Core",
      storage: "30 GB NVME",
      ram: "2GB DDR4 RAM",
      featured: false
    },
    {
      name: "Developer", 
      price: "$19.50/mo",
      cpu: "2x vCPU Core",
      storage: "45 GB NVME", 
      ram: "4GB DDR4 RAM",
      featured: false
    },
    {
      name: "Intermediate",
      price: "$28.50/mo", 
      cpu: "4x vCPU Core",
      storage: "85 GB NVME",
      ram: "6GB DDR4 RAM",
      featured: false
    },
    {
      name: "Premium",
      price: "$38.00/mo",
      cpu: "4x vCPU Core", 
      storage: "120 GB NVME",
      ram: "8GB DDR4 RAM",
      featured: true
    },
    {
      name: "Platinum",
      price: "$68.75/mo",
      cpu: "6x vCPU Core",
      storage: "250 GB NVME", 
      ram: "16GB DDR4 RAM",
      featured: false
    },
    {
      name: "Enterprise",
      price: "$97.25/mo",
      cpu: "6x vCPU Core",
      storage: "500 GB NVME",
      ram: "24GB DDR4 RAM", 
      featured: false
    },
    {
      name: "Professional",
      price: "$128.65/mo",
      cpu: "8x vCPU Core",
      storage: "850 GB NVME",
      ram: "32GB DDR4 RAM",
      featured: false
    }
  ];

  const features = [
    {
      icon: <Zap className="h-8 w-8 text-cyan-400" />,
      title: "17 TBPS+ DDOS Protection",
      description: "Enterprise-grade protection against attacks"
    },
    {
      icon: <Shield className="h-8 w-8 text-cyan-400" />,
      title: "99.9% Uptime & Dedicated Support", 
      description: "Reliable hosting with expert assistance"
    },
    {
      icon: <Clock className="h-8 w-8 text-cyan-400" />,
      title: "Fast Control Panel & Instant Setup",
      description: "Get started immediately with our intuitive interface"
    },
    {
      icon: <HardDrive className="h-8 w-8 text-cyan-400" />,
      title: "Fast Hardware, NVME Storage",
      description: "High-performance infrastructure for optimal speed"
    }
  ];

  const trustpilotStars = Array(5).fill(0);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background */}
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
        
        
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl lg:text-8xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6">
                VPS<br />HOSTING
              </div>
              
              <div className="space-y-6 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-4">
                    {feature.icon}
                    <div>
                      <h3 className="font-semibold text-white">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trustpilot */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <Star className="h-8 w-8 text-green-500 fill-current" />
                  <span className="text-green-500 font-bold text-xl">Trustpilot</span>
                </div>
                <div>
                  <div className="flex gap-1 mb-1">
                    {trustpilotStars.map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-green-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-400">
                    Rated <span className="text-white font-semibold">4.5</span> stars on Trustpilot<br />
                    based on <span className="text-white font-semibold">2308</span> reviews
                  </p>
                </div>
              </div>
            </div>
            
            {/* 3D Server Visualization */}
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <Cpu className="h-24 w-24 text-cyan-400 mx-auto mb-4" />
                  <p className="text-gray-300">High-Performance VPS Infrastructure</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Location Selection */}
        <section className="container mx-auto px-6 mb-16">
          <h2 className="text-4xl font-bold mb-8">Plans from $9.50/mo</h2>
          <div className="flex gap-4 mb-8">
            <Badge variant="default" className="bg-cyan-500 text-white px-6 py-2 text-base">
              🇺🇸 Virginia US
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-300 px-6 py-2 text-base">
              🇺🇸 Texas US
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-300 px-6 py-2 text-base">
              🇬🇧 London UK
            </Badge>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="container mx-auto px-6 mb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card key={index} className={`bg-gray-800/50 border-gray-700 relative ${plan.featured ? 'ring-2 ring-cyan-400' : ''}`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-cyan-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-3xl font-bold text-cyan-400">{plan.price}</p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <Cpu className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">{plan.cpu}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">{plan.storage}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">{plan.ram}</span>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                    Order Now
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {/* Custom VPS */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Custom VPS</h3>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">Up To 32x vCPU Core</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">Up To 2TB NVME</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">Up To 128GB DDR4 RAM</span>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* OS Installation Section */}
        <section className="container mx-auto px-6 mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">Simplified OS Installations</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-10 h-10 bg-gray-500 rounded-full"></div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Install Your Own OS</h3>
              <p className="text-gray-400">
                Want to run your own OS? Provide our team with your own ISO and we'll run the installation procedure on your behalf.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-10 h-10 bg-gray-500 rounded-full"></div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Linux</h3>
              <p className="text-gray-400">
                Choose from a variety of Linux operating systems available as one-click installs using our powerful control suite.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-10 h-10 bg-gray-500 rounded-full"></div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Windows Server 2022</h3>
              <p className="text-gray-400">
                <span className="text-red-400 font-semibold">PAID LICENSE.</span> We offer Windows 2022 Server installations on your VPS which you can purchase at checkout.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="container mx-auto px-6 mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">Why Use Our VPS Hosting?</h2>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-4">STOP/START/REINSTALL MULTIPLE SERVERS</h3>
                <p className="text-gray-400">
                  Manage all of your VPS instances from a single control interface. Easy power controls available from both the billing area and Virtualizor panel.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-4">MONITOR RESOURCE USAGE</h3>
                <p className="text-gray-400">
                  Keep an eye on your instances by monitoring their resource and network usage.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-4">SCHEDULE BACKUPS</h3>
                <p className="text-gray-400">
                  Coming soon: Schedule automatic offsite backups of your VPS for ultimate redundancy.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800/30 rounded-lg p-8 backdrop-blur-sm">
              <div className="text-center">
                <Headphones className="h-24 w-24 text-cyan-400 mx-auto mb-4" />
                <p className="text-gray-300">VPS Management Interface</p>
              </div>
            </div>
          </div>
        </section>

        
      </div>
    </div>
  );
};

export default VPS;
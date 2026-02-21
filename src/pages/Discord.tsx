
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { MessageCircle, Users, Calendar, Shield, Headphones, Bell } from 'lucide-react';

const Discord = () => {
  const communityFeatures = [
    {
      icon: MessageCircle,
      title: "Community Chat",
      description: "Connect with other server owners, share tips, and make new friends in our active community channels."
    },
    {
      icon: Headphones,
      title: "Server Support",
      description: "Get quick technical assistance from our team and community members for your hosting questions."
    },
    {
      icon: Bell,
      title: "Exclusive Updates",
      description: "Be the first to know about new features, server updates, and special promotions in our announcements channel."
    }
  ];

  const upcomingEvents = [
    {
      title: "Server Setup Workshop",
      date: "Jan 25",
      description: "Learn how to configure your server for optimal performance."
    },
    {
      title: "Admin Tool Training",
      date: "Feb 2",
      description: "Get familiar with advanced server administration tools."
    },
    {
      title: "Community Game Night",
      date: "Feb 8",
      description: "Join us for fun multiplayer games and prizes."
    }
  ];

  const serverRules = {
    dos: [
      "Be respectful to all community members",
      "Keep discussions in appropriate channels",
      "Use proper channels for support requests"
    ],
    donts: [
      "No harassment or bullying",
      "No spamming or self-promotion",
      "No sharing exploits or cheats"
    ]
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
        
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-8">
            <a href="/" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors mb-6">
              ← Back to Home
            </a>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              GIVRwrld
            </span>{' '}
            <span className="text-white">Discord Community</span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Join our thriving community of server owners, connect with our support team, 
            and stay updated on the latest events and announcements.
          </p>
          
          <button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25">
            Join Our Discord →
          </button>
        </section>

        {/* Community Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {communityFeatures.map((feature, index) => {
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
        </section>

        {/* Upcoming Events */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Upcoming Community Events</h2>
            <p className="text-gray-300 mb-8">
              Stay up to date with all the events happening in our Discord server. Don't miss out on valuable learning opportunities and fun community activities!
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="bg-gray-700/40 rounded-lg p-6 border border-gray-600/30">
                  <div className="flex items-center mb-4">
                    <Calendar size={20} className="text-emerald-400 mr-2" />
                    <span className="text-emerald-400 font-semibold">{event.date}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{event.title}</h3>
                  <p className="text-gray-300 text-sm">{event.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Server Rules */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Server Rules & Guidelines</h2>
            <p className="text-gray-300 mb-8 text-center max-w-3xl mx-auto">
              Our community thrives when everyone follows the rules. Please review our guidelines to 
              ensure a positive experience for all members.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-emerald-400 mb-4">Do's:</h3>
                <ul className="space-y-3">
                  {serverRules.dos.map((rule, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      <span className="text-gray-300">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-red-400 mb-4">Don'ts:</h3>
                <ul className="space-y-3">
                  {serverRules.donts.map((rule, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-400 mr-2">•</span>
                      <span className="text-gray-300">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        
      </div>
    </div>
  );
};

export default Discord;

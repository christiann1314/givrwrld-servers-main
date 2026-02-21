import React from 'react';
// Header and Footer are included in App.tsx

const About = () => {
  const features = [
    {
      icon: "🎮",
      title: "Early access to new game templates",
      description: "Be the first to experience cutting-edge gaming innovations"
    },
    {
      icon: "🎁", 
      title: "Promo codes for your audience",
      description: "Exclusive deals and discounts to share with your community"
    },
    {
      icon: "📢",
      title: "Featured shoutouts on our blog and Discord", 
      description: "Get visibility and recognition across our platforms"
    },
    {
      icon: "🤝",
      title: "Partnered realm hosting (custom servers with your branding)",
      description: "White-label solutions tailored to your brand identity"
    },
    {
      icon: "🎯",
      title: "Affiliate-exclusive Discord roles and drops",
      description: "Special perks and exclusive content for our partners"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/48 via-gray-900/30 to-gray-900/56"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header is included in App.tsx */}
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Main Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
                What Makes Us Different?
              </span>
            </h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl text-gray-300 leading-relaxed">
                We're building the intersection of gaming, ownership, education, and movement. 
                GIVRwrld is built on performance, transparency, and community. We offer ultra-fast servers for 
                Minecraft, Rust, and Palworld — and now you can become part of our story by sharing what you already love.
              </p>
            </div>
          </div>

          {/* Why Join Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="text-emerald-400">🌟 Why Join?</span>
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-lg font-semibold text-white mb-2">Content creator</h3>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-blue-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">🎭</div>
                <h3 className="text-lg font-semibold text-white mb-2">RP community admin</h3>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-purple-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">📺</div>
                <h3 className="text-lg font-semibold text-white mb-2">YouTube mod reviewer</h3>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">🎮</div>
                <h3 className="text-lg font-semibold text-white mb-2">Discord server manager</h3>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 text-center hover:border-blue-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">🌟</div>
                <h3 className="text-lg font-semibold text-white mb-2">TikTok gaming personality</h3>
              </div>
            </div>
          </div>

          {/* Partnership Benefits */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="text-purple-400">🎁 Partnership Benefits</span>
            </h2>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{feature.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-300">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Your Gaming Server?</h2>
            <p className="text-gray-300 mb-6">
              Launch your custom game server in minutes with our simple setup process. 
              High performance, low latency, and 24/7 support included.
            </p>
            <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25">
              Deploy Your Server
            </button>
          </div>
        </div>
        
        {/* Footer is included in App.tsx */}
      </div>
    </div>
  );
};

export default About;

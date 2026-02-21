
import React from 'react';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
// Footer is included in App.tsx

const Index = () => {
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
        <HeroSection />
        <FeaturesSection />
        {/* Footer is included in App.tsx */}
      </div>
    </div>
  );
};

export default Index;

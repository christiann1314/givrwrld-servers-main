
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Terms = () => {
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
        
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                GIVRwrld Terms of Service
              </span>
            </h1>
            <p className="text-gray-400">Effective Date: November 1, 2024</p>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                Welcome to GIVRwrld, a leading gaming server hosting and management platform. These Terms of Service ("Terms") govern your use of our services, including our website, server hosting, and related tools. By using our services, you agree to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Account Registration and Responsibilities</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>When you create an account with GIVRwrld, you agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Use our services only for lawful purposes</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. Service Scope and Limitations</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>GIVRwrld provides game server hosting services for various platforms including:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Minecraft server hosting and management</li>
                  <li>Rust server hosting for survival multiplayer</li>
                  <li>Palworld dedicated server hosting</li>
                  <li>Additional game server types as announced</li>
                </ul>
                <p>Service availability may vary by region and server capacity.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Billing, Payments, and Refunds</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>Payment terms and conditions:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>All services are billed in advance on a monthly or annual basis</li>
                  <li>Payment is due at the time of service activation</li>
                  <li>We accept major credit cards, PayPal, and other approved payment methods</li>
                  <li>Prices are subject to change with 30 days notice</li>
                  <li>Refunds are handled according to our Refund Policy</li>
                  <li>Failure to pay may result in service suspension or termination</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. User Content and Conduct Restrictions</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>You are prohibited from using our servers to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Host illegal content or engage in illegal activities</li>
                  <li>Distribute malware, viruses, or harmful software</li>
                  <li>Engage in harassment, hate speech, or discriminatory behavior</li>
                  <li>Violate intellectual property rights</li>
                  <li>Attempt to hack, exploit, or compromise our infrastructure</li>
                  <li>Use excessive resources that impact other users</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Data Ownership and Use</h2>
              <p className="text-gray-300 leading-relaxed">
                You retain ownership of all content and data you upload to our servers. We may access your data only as necessary to provide our services, resolve technical issues, or comply with legal requirements. We implement reasonable security measures to protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">7. Modifications and Termination of Services</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify, suspend, or terminate our services at any time. We will provide reasonable notice of significant changes. You may terminate your account at any time through your account dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">8. Disclaimers and Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid for services in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">9. Legal Jurisdiction</h2>
              <p className="text-gray-300 leading-relaxed">
                These Terms are governed by the laws of [Jurisdiction]. Any disputes will be resolved in the courts of [Jurisdiction].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">10. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                For questions about these Terms, contact us at legal@givrwrld.com or through our support system.
              </p>
            </section>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Terms;

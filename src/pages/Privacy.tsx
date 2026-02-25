
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Privacy = () => {
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
                Privacy Policy
              </span>
            </h1>
            <p className="text-gray-400">Last Updated: November 1, 2024</p>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                This Privacy Policy describes how GIVRwrld ("we," "us," "our") collects, uses, shares, and protects your personal information when you use our gaming server hosting platform and related services. By using our services, you consent to the practices described in this Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Information We Collect</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>We collect the following types of information:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Personal information you provide (name, email, payment information)</li>
                  <li>Technical data (IP address, browser type, device information)</li>
                  <li>Usage data (how you interact with our services)</li>
                  <li>Server logs and performance metrics</li>
                  <li>Communications with customer support</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. How We Use Your Information</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide and maintain our services</li>
                  <li>Process payments and manage accounts</li>
                  <li>Provide customer support and communications</li>
                  <li>Monitor and improve service performance</li>
                  <li>Ensure security and prevent fraud</li>
                  <li>Comply with legal requirements</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Cookies and Tracking Technologies</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze site usage and performance</li>
                  <li>Provide personalized experiences</li>
                  <li>Enable security features</li>
                </ul>
                <p>You can control cookie preferences through your browser settings.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Information Sharing and Disclosure</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>We do not sell your personal data. We may share information with:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Service providers who help us operate our business</li>
                  <li>Payment processors for transaction handling</li>
                  <li>Legal authorities when required by law or to protect our rights</li>
                  <li>Third parties in case of business transfer or merger</li>
                </ul>
                <p>All third parties are required to maintain the confidentiality and security of your data.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Data Storage and Retention</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>We store your data using industry-standard security measures and retain it only as long as necessary to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide our services to you</li>
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes and enforce agreements</li>
                  <li>Maintain business records as required</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">7. Data Security Measures</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>We implement comprehensive security measures including:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>SSL encryption and secure data transmission</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and authentication systems</li>
                  <li>Employee training on data protection</li>
                  <li>Incident response and breach notification procedures</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">8. Your Rights as a Data Subject</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p>Depending on your jurisdiction, you may have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Access and review your personal data</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your data</li>
                  <li>Data portability and transfer rights</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">9. Third-Party Services</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services may integrate with third-party platforms such as Discord, Steam, payment processors (e.g. PayPal), and email providers. These third parties have their own privacy policies. We encourage you to review those policies; we are not responsible for their privacy practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of significant changes by email or through our services. Continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">12. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed">
                For questions about this Privacy Policy or to exercise your rights, contact us at givrwlrdservers.com@outlook.com or through our support center.
              </p>
            </section>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Privacy;

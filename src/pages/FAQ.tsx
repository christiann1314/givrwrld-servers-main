
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const faqCategories = [
    {
      title: 'General Questions',
      questions: [
        {
          id: 'what-is-givrworld',
          question: 'What is GIVRwrld Servers?',
          answer: 'GIVRwrld Servers is a premium game server hosting platform that provides high-performance servers for games like Minecraft, Rust, and Palworld. We offer instant setup, 24/7 support, and enterprise-grade infrastructure.'
        },
        {
          id: 'getting-started',
          question: 'How do I get started with GIVRwrld Servers?',
          answer: 'Getting started is easy! Simply choose your game type, select a server plan that fits your needs, complete the setup process, and your server will be ready in minutes. Our control panel makes server management simple and intuitive.'
        },
        {
          id: 'provisioning-time',
          question: 'How long does it take for my server to be ready after purchase?',
          answer: 'Most servers are automatically provisioned and ready within 3-5 minutes after payment. You\'ll see your server appear in your dashboard once provisioning is complete. If your server takes longer than 10 minutes, please contact support for assistance.'
        },
        {
          id: 'panel-access',
          question: 'How do I access my server control panel (Pterodactyl)?',
          answer: 'After your server is provisioned, you can access the control panel from your dashboard. Click "Open Panel" on any server card, or go directly to https://panel.givrwrldservers.com and log in with your account email. If you don\'t have a panel account yet, one is automatically created during signup or you can create one manually from the dashboard.'
        },
        {
          id: 'customer-support',
          question: 'Do you offer 24/7 customer support?',
          answer: 'Yes! Our expert support team is available 24/7 to help with any technical issues, questions, or server configurations. You can reach us through our Discord server, support tickets, or live chat.'
        },
        {
          id: 'server-upgrade',
          question: 'Can I upgrade my server later?',
          answer: 'Absolutely! You can upgrade your server resources at any time through your control panel. Upgrades are applied instantly without any downtime, and you only pay the prorated difference.'
        }
      ]
    },
    {
      title: 'Technical Questions',
      questions: [
        {
          id: 'control-panel',
          question: 'What control panel do you use for server management?',
          answer: 'We use a custom-built control panel designed specifically for gaming servers. It includes features like one-click mod installation, automatic backups, real-time monitoring, and easy file management.'
        },
        {
          id: 'server-backups',
          question: 'Are server backups included?',
          answer: 'Yes! We automatically create daily backups of your server data. You can also create manual backups at any time through the control panel. All backups are stored securely and can be restored with one click.'
        },
        {
          id: 'server-hardware',
          question: 'What hardware do your servers run on?',
          answer: 'Our servers run on premium hardware including high-frequency Intel CPUs, NVMe SSD storage, and DDR4 RAM. All servers are housed in Tier 1 data centers with redundant power and network connections.'
        },
        {
          id: 'custom-plugins',
          question: 'Do you support custom plugins and mods?',
          answer: 'Yes! You have full control over your server and can install any compatible plugins, mods, or custom configurations. We also provide one-click installation for popular mod packs and plugins.'
        }
      ]
    },
    {
      title: 'Billing Questions',
      questions: [
        {
          id: 'payment-methods',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and select cryptocurrencies. All payments are processed securely with SSL encryption.'
        },
        {
          id: 'billing-cycle',
          question: 'How does billing work?',
          answer: 'Billing is monthly by default, but we also offer quarterly and annual plans with discounts. You can change your billing cycle at any time, and we prorate charges accordingly.'
        },
        {
          id: 'refund-policy',
          question: 'What is your refund policy?',
          answer: 'We offer a 7-day money-back guarantee for all new customers. If you\'re not satisfied with our service, contact support within 7 days of your first payment for a full refund.'
        },
        {
          id: 'server-suspension',
          question: 'What happens if my payment fails?',
          answer: 'If a payment fails, we\'ll attempt to charge your payment method again after 3 days. If payment continues to fail, your server will be suspended after 7 days. You have 30 days to resolve payment issues before data deletion.'
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

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
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Frequently Asked</span>{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Find answers to common questions about our services, technical specifications, 
            and billing policies.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
              />
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
              <p className="text-gray-400">Try adjusting your search terms or browse all categories.</p>
            </div>
          ) : (
            filteredCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-12">
                <h2 className="text-2xl font-bold text-emerald-400 mb-6">{category.title}</h2>
                <div className="space-y-4">
                  {category.questions.map((faq) => (
                    <div key={faq.id} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                      >
                        <span className="text-white font-medium">{faq.question}</span>
                        {openFaq === faq.id ? (
                          <ChevronDown className="text-emerald-400 flex-shrink-0" size={20} />
                        ) : (
                          <ChevronRight className="text-gray-400 flex-shrink-0" size={20} />
                        )}
                      </button>
                      {openFaq === faq.id && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        
      </div>
    </div>
  );
};

export default FAQ;

import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  HelpCircle, 
  MessageCircle, 
  Clock, 
  Shield, 
  User, 
  Mail, 
  FileText, 
  Send,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { ENV } from '@/config/env';

const Support = () => {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const faqs = [
    {
      id: 'provisioning',
      question: 'How long does server provisioning take?',
      answer: 'Server provisioning is automatic and typically completes within 3–5 minutes after PayPal confirms your payment. You can monitor the status in your dashboard. If your server takes longer than 10 minutes, please contact support.'
    },
    {
      id: 'panel-access',
      question: 'How do I access my Pterodactyl control panel?',
      answer: 'After your server is provisioned, click "Open Panel" in your dashboard, or go to https://panel.givrwrldservers.com and log in with your account email. A panel account is automatically created during signup, but you can also create one manually from the dashboard if needed.'
    },
    {
      id: 'connect',
      question: 'How do I connect to my server?',
      answer: 'You can connect to your server using the IP address and port provided in your control panel. Make sure your server is running, that you are using the correct game version, and that any local firewall or router rules allow the connection.'
    },
    {
      id: 'upgrade',
      question: 'Can I upgrade my server later?',
      answer: 'Yes. You can upgrade your server plan at any time through your dashboard. In most cases upgrades are applied within a few minutes with no downtime.'
    },
    {
      id: 'payment',
      question: 'What payment methods do you accept?',
      answer: 'We accept payments securely through PayPal. You can pay using any funding source you have attached to your PayPal account (such as credit or debit cards), but all subscriptions and renewals are managed via PayPal.'
    },
    {
      id: 'refunds',
      question: 'Do you offer refunds?',
      answer: 'Yes. We offer a 48‑hour satisfaction guarantee for all new customers. If you are not happy with your server within the first 48 hours after activation, contact support to request a full refund.'
    },
    {
      id: 'players',
      question: 'How many players can join my server?',
      answer: 'Player limits depend on your server plan and game type. Check your plan details in the control panel for specific limits.'
    },
    {
      id: 'mods',
      question: 'Can I install mods on my server?',
      answer: 'Yes, we support custom mods and plugins for most game types. You can install them through the control panel or via FTP access.'
    }
  ];

  const supportCategories = [
    {
      icon: MessageCircle,
      title: 'Contact Support',
      description: 'Our support team is available 24/7 to assist you with technical issues, billing questions, and account changes.',
      content: 'form'
    },
    {
      icon: Clock,
      title: 'Response Times',
      description: 'We pride ourselves on fast, effective support. Here are our current response times:',
      content: 'times'
    }
  ];

  const responseTimes = [
    { type: 'Technical Support', time: '~2 hours', status: 'Most tickets answered within 2 hours' },
    { type: 'Billing Support', time: '~1 hour', status: 'Most tickets answered within 1 hour' },
    { type: 'Sales Inquiries', time: '~30 min', status: 'Most inquiries answered within 30 minutes' }
  ];

  const securityInfo = [
    {
      title: 'DDoS Protection',
      description: 'Enterprise-grade protection against distributed denial-of-service attacks.'
    },
    {
      title: 'Secure Authentication',
      description: 'Multi-factor authentication and encrypted connections for all server access.'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch(`${ENV.API_BASE.replace(/\/+$/, '')}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to send your message. Please try again.');
      }
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Sword Background - Updated to match rest of website */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/55 via-gray-900/35 to-gray-900/65"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-cyan-900/10"></div>
      </div>
      
      <div className="relative z-10">
        
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Support</span>{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              &amp; Help Center
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Start here for help with provisioning, billing, or account questions. Browse quick answers below or reach our 24/7 team any time.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-panel-strong rounded-xl p-8 mb-16">
            <div className="flex items-center mb-6">
              <HelpCircle className="text-emerald-400 mr-3" size={28} />
              <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-600/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    {openFaq === faq.id ? (
                      <ChevronDown className="text-emerald-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                  </button>
                  {openFaq === faq.id && (
                    <div className="p-4 bg-gray-700/20 border-t border-gray-600/30">
                      <p className="text-gray-300">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Support Categories */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="glass-panel-strong rounded-xl p-8">
              <div className="flex items-center mb-6">
                <MessageCircle className="text-emerald-400 mr-3" size={28} />
                <h3 className="text-2xl font-bold text-white">Contact Support</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Our support team is available 24/7 to assist you with technical issues, billing questions, and account changes.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your Name"
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="How can we help?"
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Please describe your issue in detail"
                    rows={6}
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="mr-2 animate-spin border-2 border-white/40 border-t-transparent rounded-full w-4 h-4" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={18} className="mr-2" />
                      Send Message
                    </>
                  )}
                </button>
                {submitSuccess && (
                  <p className="text-xs text-emerald-300 mt-3 text-center">
                    Thanks! Your message has been sent to our support team. We’ll reply to the email you provided.
                  </p>
                )}
                {submitError && (
                  <p className="text-xs text-red-400 mt-3 text-center">
                    {submitError}
                  </p>
                )}
              </form>
            </div>

            {/* Response Times & Security */}
            <div className="space-y-8">
              {/* Response Times */}
              <div className="glass-panel-strong rounded-xl p-8">
                <div className="flex items-center mb-6">
                  <Clock className="text-emerald-400 mr-3" size={28} />
                  <h3 className="text-2xl font-bold text-white">Response Times</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  We pride ourselves on fast, effective support. Here are our current response times:
                </p>
                
                <div className="space-y-4">
                  {responseTimes.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{item.type}</div>
                        <div className="text-sm text-gray-400">{item.status}</div>
                      </div>
                      <div className="text-emerald-400 font-bold">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Information */}
              <div className="glass-panel-strong rounded-xl p-8">
                <div className="flex items-center mb-6">
                  <Shield className="text-emerald-400 mr-3" size={28} />
                  <h3 className="text-2xl font-bold text-white">Security Information</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  We take security seriously. Here's how we protect your servers:
                </p>
                
                <div className="space-y-4">
                  {securityInfo.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                      <div className="text-white font-medium mb-2">{item.title}</div>
                      <div className="text-sm text-gray-400">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        
      </div>
    </div>
  );
};

export default Support;

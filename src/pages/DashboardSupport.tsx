
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { useSupportData } from '../hooks/useSupportData';
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter
} from 'lucide-react';

const DashboardSupport = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });
  
  const { user } = useAuth();
  const { supportData, createTicket } = useSupportData(user?.email);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500/20 text-emerald-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'resolved': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createTicket(ticketForm);
    if (success) {
      setShowNewTicketForm(false);
      setTicketForm({ subject: '', category: '', priority: 'medium', description: '' });
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
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-blue-900/10"></div>
      </div>
      
      <div className="relative z-10">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Support Center
                </span>
              </h1>
              <p className="text-gray-300">Manage your support tickets and get help</p>
            </div>
            <button
              onClick={() => setShowNewTicketForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center"
            >
              <Plus size={20} className="mr-2" />
              New Ticket
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6 mb-8">
            <div className="flex space-x-6 mb-6">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                  activeTab === 'tickets'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <MessageCircle size={20} />
                <span>My Tickets</span>
              </button>
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                  activeTab === 'knowledge'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <HelpCircle size={20} />
                <span>Knowledge Base</span>
              </button>
            </div>

            {activeTab === 'tickets' && (
              <div>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <button className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-4 py-3 rounded-lg transition-colors flex items-center">
                    <Filter size={20} className="mr-2" />
                    Filter
                  </button>
                </div>

                {/* Tickets List */}
                <div className="space-y-4">
                  {supportData.tickets.map((ticket) => (
                    <div key={ticket.id} className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-6 hover:border-emerald-500/50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-white font-semibold">{ticket.subject}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>#{ticket.id}</span>
                            <span>{ticket.category}</span>
                            <span className={getPriorityColor(ticket.priority)}>
                              {ticket.priority} priority
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          <div>Created: {ticket.created}</div>
                          <div>Updated: {ticket.updated}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <MessageCircle size={16} className="mr-1" />
                            {ticket.responses} responses
                          </span>
                        </div>
                        <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div className="text-center py-12">
                <HelpCircle className="mx-auto mb-4 text-gray-400" size={64} />
                <h3 className="text-xl font-semibold text-white mb-4">Knowledge Base</h3>
                <p className="text-gray-400 mb-6">
                  Browse our comprehensive knowledge base for quick answers to common questions.
                </p>
                <Link 
                  to="/faq"
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Browse FAQ
                </Link>
              </div>
            )}
          </div>

          {/* New Ticket Form Modal */}
          {showNewTicketForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Create New Support Ticket</h2>
                  <button
                    onClick={() => setShowNewTicketForm(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Subject</label>
                    <input
                      type="text"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Category</label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                        className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                        required
                      >
                        <option value="">Select category</option>
                        <option value="technical">Technical Support</option>
                        <option value="billing">Billing</option>
                        <option value="general">General Inquiry</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">Priority</label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}
                        className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Description</label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      rows={6}
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none resize-none"
                      placeholder="Please describe your issue in detail..."
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowNewTicketForm(false)}
                      className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
                    >
                      Create Ticket
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
};

export default DashboardSupport;

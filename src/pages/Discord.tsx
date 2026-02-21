import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Headphones, Bell, Shield, ExternalLink, Activity } from 'lucide-react';
import { ENV } from '@/config/env';

const DISCORD_INVITE_URL = ENV.DISCORD_INVITE_URL?.trim() || '';

const Discord = () => {
  const features = [
    {
      icon: Headphones,
      title: '24/7 support',
      description: 'Get help from our team and community. Use the support channel or open a ticket for server issues, billing, or setup questions.',
    },
    {
      icon: Bell,
      title: 'Announcements & updates',
      description: 'Maintenance windows, new games, features, and incidents are posted in announcements so you’re always in the loop.',
    },
    {
      icon: Activity,
      title: 'Service status',
      description: 'We post status updates in Discord and keep our status page in sync. Check the channel or our status page for current uptime.',
    },
    {
      icon: MessageCircle,
      title: 'Community',
      description: 'Connect with other server owners, share configs and mods, and get tips. Many of our best ideas come from the community.',
    },
  ];

  const rules = [
    'Be respectful; no harassment or spam.',
    'Use the right channel for support vs general chat.',
    'No sharing exploits, cheats, or illegal content.',
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-blue-900/20" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <Link to="/" className="inline-flex text-emerald-400 hover:text-emerald-300 text-sm font-medium mb-8">
          ← Back to Home
        </Link>

        {/* Hero */}
        <section className="text-center mb-14">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              GIVRwrld
            </span>{' '}
            <span className="text-white">on Discord</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Support, announcements, status updates, and community—all in one place. Join to get help, stay updated, and connect with other server owners.
          </p>

          {DISCORD_INVITE_URL ? (
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <MessageCircle size={20} />
              Join our Discord
              <ExternalLink size={16} />
            </a>
          ) : (
            <p className="text-gray-400 text-sm">
              Invite link not configured. Set <code className="bg-gray-800 px-1 rounded">VITE_DISCORD_INVITE_URL</code> to enable the join button.
            </p>
          )}
        </section>

        {/* What you get */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-white mb-6">What you get</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Icon className="text-emerald-400" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Status page link */}
        <section className="mb-14">
          <Link
            to="/status"
            className="flex items-center justify-between gap-4 bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-4 hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity className="text-emerald-400 shrink-0" size={24} />
              <div>
                <div className="font-semibold text-white">Service status</div>
                <div className="text-gray-400 text-sm">Uptime, incidents, and latency</div>
              </div>
            </div>
            <ExternalLink className="text-gray-400 shrink-0" size={18} />
          </Link>
        </section>

        {/* Rules */}
        <section className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Shield size={20} className="text-emerald-400" />
            Server rules
          </h2>
          <ul className="space-y-2 text-gray-300 text-sm">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Discord;

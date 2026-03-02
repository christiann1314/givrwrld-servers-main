import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, FileText, Clock, Shield } from 'lucide-react';

const Transparency = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8" />
      </div>

      <div className="relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="mb-12">
            <Link
              to="/"
              className="inline-flex text-emerald-400 hover:text-emerald-300 text-sm font-medium mb-6"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Transparency
              </span>
            </h1>
            <p className="text-lg text-gray-300">
              How we run our infrastructure and what you can expect. Use this page in ads and comparison pitches.
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Activity className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Status &amp; uptime</h2>
                  <p className="text-gray-300 mb-4">
                    Our status page shows API, database, and panel health in real time. We update it during incidents.
                  </p>
                  <Link
                    to="/status"
                    className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    View status page →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Clock className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Typical time to server ready</h2>
                  <p className="text-gray-300 mb-4">
                    We publish a live median provisioning time (last 24 hours) so you know what to expect. No inflated claims.
                  </p>
                  <Link
                    to="/status"
                    className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    See typical provisioning time on Status →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <FileText className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Incident log</h2>
                  <p className="text-gray-300 mb-4">
                    When something goes wrong, we document what happened and what we did. Short, plain-language postmortems live on our status page.
                  </p>
                  <Link
                    to="/status"
                    className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    View incident log on Status →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">DDoS &amp; guarantee</h2>
                  <p className="text-gray-300">
                    DDoS mitigation is included for all game servers. Not happy in the first 48 hours? Contact support for a full refund.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transparency;

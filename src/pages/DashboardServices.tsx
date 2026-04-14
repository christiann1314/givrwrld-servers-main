import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Server } from 'lucide-react';
import { useUserServers } from '../hooks/useUserServers';
import { useAuth } from '../hooks/useAuth';
import { useServiceMetrics } from '../hooks/useServiceMetrics';

const DashboardServices = () => {
  const { user } = useAuth();
  const { serversData } = useUserServers(user?.email);
  const serverIds = React.useMemo(() => (serversData.servers || []).map((s: any) => s.id), [serversData.servers]);
  const { liveByServer } = useServiceMetrics(serverIds);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/55 via-gray-900/35 to-gray-900/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-blue-900/10" />
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-black/55 text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition-colors"
            >
              <ArrowLeft size={20} className="mr-1" />
              Back to Dashboard
            </Link>
            <div className="text-xs text-gray-300 bg-gray-800/60 border border-gray-600/50 px-3 py-1 rounded-full">
              Live · updates every 15s
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Game Panel
              </span>
            </h1>
            <p className="text-gray-300">Native control panel for all of your game servers.</p>
          </div>

          {serversData.loading ? (
            <div className="text-gray-300">Loading services...</div>
          ) : serversData.servers.length === 0 ? (
            <div className="text-center py-12">
              <Server size={48} className="mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Services Yet</h3>
              <p className="text-gray-400 mb-6">Deploy your first game server to get started.</p>
              <Link to="/dashboard/order" className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors">
                Deploy Server
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {serversData.servers.map((server: any) => {
                const live = liveByServer[server.id] || {
                  status: 'Offline',
                  currentPlayers: 0,
                  maxPlayers: 0,
                  cpuPercent: 0,
                  ramPercent: 0,
                  uptimeSeconds: 0,
                };
                return (
                  <div key={server.id} className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6 hover:border-emerald-500/40 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{server.server_name || server.name}</h3>
                        <p className="text-gray-400 text-sm capitalize">{server.game}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${live.status === 'Online' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                        {live.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Players</div>
                        <div className="text-lg font-semibold">{live.currentPlayers} / {live.maxPlayers || 0}</div>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3 flex items-center justify-center">
                        <Link
                          to={`/dashboard/services/${server.id}`}
                          className="text-gray-300 hover:text-white text-sm font-medium"
                        >
                          Open Game Panel
                        </Link>
                      </div>
                    </div>

                    {/* Historical performance summary removed for now; users can see detailed metrics on the server details page. */}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardServices;

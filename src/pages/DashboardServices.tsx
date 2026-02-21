import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowLeft, Server, BarChart3 } from 'lucide-react';
import { useUserServers } from '../hooks/useUserServers';
import { useAuth } from '../hooks/useAuth';
import { useServiceMetrics } from '../hooks/useServiceMetrics';

function formatUptime(seconds: number) {
  const safe = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

const DashboardServices = () => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { serversData } = useUserServers(user?.email);
  const serverIds = React.useMemo(() => (serversData.servers || []).map((s: any) => s.id), [serversData.servers]);
  const { liveByServer, summaryByServer, wsConnected } = useServiceMetrics(serverIds);

  const toggleSummary = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
            <Link to="/dashboard" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
              <ArrowLeft size={20} className="mr-2" />
              Back to Dashboard
            </Link>
            <div className="text-xs text-gray-300 bg-gray-800/60 border border-gray-600/50 px-3 py-1 rounded-full">
              {wsConnected ? 'Live Stream Connected' : 'Polling every 15s'}
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                My Services
              </span>
            </h1>
            <p className="text-gray-300">Executive summary of server health and performance.</p>
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
                const summary = summaryByServer[server.id] || {
                  avgCpuPercent: 0,
                  peakPlayers: 0,
                  uptimePercent: 0,
                  restartCount: 0,
                };
                const isExpanded = !!expanded[server.id];

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

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Players</div>
                        <div className="text-lg font-semibold">{live.currentPlayers} / {live.maxPlayers || 0}</div>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Live CPU %</div>
                        <div className="text-lg font-semibold">{Number(live.cpuPercent || 0).toFixed(1)}%</div>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Live RAM %</div>
                        <div className="text-lg font-semibold">{Number(live.ramPercent || 0).toFixed(1)}%</div>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Uptime</div>
                        <div className="text-lg font-semibold">{formatUptime(live.uptimeSeconds || 0)}</div>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3 flex items-center justify-center">
                        <a
                          href={server.pterodactyl_url || server.pterodactylUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 hover:text-emerald-200 text-sm font-medium"
                        >
                          Open Game Panel
                        </a>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => toggleSummary(server.id)}
                        className="inline-flex items-center text-sm text-cyan-300 hover:text-cyan-200"
                      >
                        <BarChart3 size={14} className="mr-2" />
                        7-Day Performance Summary
                        <ChevronDown size={14} className={`ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">Avg CPU %</div>
                          <div className="text-lg font-semibold">{Number(summary.avgCpuPercent || 0).toFixed(1)}%</div>
                        </div>
                        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">Peak Players</div>
                          <div className="text-lg font-semibold">{summary.peakPlayers || 0}</div>
                        </div>
                        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">Uptime %</div>
                          <div className="text-lg font-semibold">{Number(summary.uptimePercent || 0).toFixed(1)}%</div>
                        </div>
                        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">Restart Count</div>
                          <div className="text-lg font-semibold">{summary.restartCount || 0}</div>
                        </div>
                      </div>
                    )}
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

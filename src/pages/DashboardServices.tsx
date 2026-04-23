import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Server, Users, ChevronRight, Wifi, WifiOff, Gamepad2 } from 'lucide-react';
import { useUserServers } from '../hooks/useUserServers';
import { useAuth } from '../hooks/useAuth';
import { useServiceMetrics } from '../hooks/useServiceMetrics';

const GAME_HERO_IMAGES: Record<string, string> = {
  minecraft: 'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg',
  palworld: 'https://cdn.akamai.steamstatic.com/steam/apps/1623730/library_hero.jpg',
  rust: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
  ark: 'https://cdn.akamai.steamstatic.com/steam/apps/2399830/library_hero.jpg',
  'ark-asa': 'https://cdn.akamai.steamstatic.com/steam/apps/1874880/library_hero.jpg',
  'counter-strike': 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg',
  terraria: 'https://cdn.akamai.steamstatic.com/steam/apps/105600/library_hero.jpg',
  factorio: 'https://cdn.akamai.steamstatic.com/steam/apps/427520/library_hero.jpg',
  mindustry: 'https://cdn.akamai.steamstatic.com/steam/apps/1127400/library_hero.jpg',
  rimworld: 'https://cdn.akamai.steamstatic.com/steam/apps/294100/library_hero.jpg',
  'vintage-story': 'https://cdn.akamai.steamstatic.com/steam/apps/1608230/library_hero.jpg',
  teeworlds: 'https://cdn.akamai.steamstatic.com/steam/apps/380840/library_hero.jpg',
  'among-us': 'https://cdn.akamai.steamstatic.com/steam/apps/945360/library_hero.jpg',
  veloren: '/images/veloren-hero.jpg',
  enshrouded: 'https://cdn.akamai.steamstatic.com/steam/apps/1203620/library_hero.jpg',
};

const GAME_DISPLAY_NAMES: Record<string, string> = {
  minecraft: 'Minecraft',
  palworld: 'Palworld',
  rust: 'Rust',
  ark: 'ARK: Survival Evolved',
  'ark-asa': 'ARK: Survival Ascended',
  'counter-strike': 'Counter-Strike: Global Offensive',
  terraria: 'Terraria',
  factorio: 'Factorio',
  mindustry: 'Mindustry',
  rimworld: 'RimWorld',
  'vintage-story': 'Vintage Story',
  teeworlds: 'Teeworlds',
  'among-us': 'Among Us',
  veloren: 'Veloren',
  enshrouded: 'Enshrouded',
};

function normalizeSlug(game: string): string {
  const s = (game || 'minecraft').toLowerCase().replace(/\s+/g, '-');
  const aliases: Record<string, string> = {
    amongus: 'among-us',
    vintagestory: 'vintage-story',
    csgo: 'counter-strike',
  };
  return aliases[s] || s;
}

function getHeroImage(game: string): string {
  return GAME_HERO_IMAGES[normalizeSlug(game)] || GAME_HERO_IMAGES.minecraft;
}

function getDisplayName(game: string): string {
  return GAME_DISPLAY_NAMES[normalizeSlug(game)] || game;
}

function StatusPulse({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
    </span>
  );
}

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
            <div className="text-xs text-gray-300 bg-gray-800/60 border border-gray-600/50 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Live · updates every 15s
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Game Panel
              </span>
            </h1>
            <p className="text-gray-400 text-lg">Manage and control all of your game servers.</p>
          </div>

          {serversData.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-gray-800/40 border border-gray-700/30 h-72 animate-pulse" />
              ))}
            </div>
          ) : serversData.servers.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/60 border border-gray-600/50 mb-6">
                <Gamepad2 size={36} className="text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No Servers Yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Deploy your first game server and it will appear here with live stats and controls.</p>
              <Link to="/dashboard/order" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/20">
                <Server size={18} />
                Deploy Server
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serversData.servers.map((server: any) => {
                const live = liveByServer[server.id] || {
                  status: 'Offline',
                  currentPlayers: 0,
                  maxPlayers: 0,
                  cpuPercent: 0,
                  ramPercent: 0,
                  uptimeSeconds: 0,
                };
                const isOnline = live.status === 'Online';
                const gameSlug = server.game_type || server.game || server.plan_id?.split?.('-')?.[0] || 'minecraft';
                const heroImg = getHeroImage(gameSlug);
                const gameName = getDisplayName(gameSlug);

                return (
                  <Link
                    key={server.id}
                    to={`/dashboard/services/${server.id}`}
                    className="group relative rounded-2xl overflow-hidden border border-gray-700/40 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
                  >
                    {/* Hero image */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={heroImg}
                        alt={gameName}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/30 to-transparent" />

                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${isOnline ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40' : 'bg-red-500/20 text-red-300 border-red-400/30'}`}>
                          <StatusPulse online={isOnline} />
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>

                      {/* Game title overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-emerald-400/90 text-xs font-semibold uppercase tracking-widest mb-0.5">{gameName}</p>
                        <h3 className="text-xl font-bold text-white truncate drop-shadow-lg">{server.server_name || server.name}</h3>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="bg-gray-800/80 backdrop-blur-xl p-4">
                      {/* Stats row */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-1.5 bg-gray-900/50 border border-gray-700/40 rounded-lg px-3 py-1.5">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-sm font-medium">{live.currentPlayers}<span className="text-gray-500"> / {live.maxPlayers || 0}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-900/50 border border-gray-700/40 rounded-lg px-3 py-1.5">
                          {isOnline ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-gray-500" />}
                          <span className={`text-sm font-medium ${isOnline ? 'text-emerald-300' : 'text-gray-400'}`}>
                            {isOnline ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 px-4 py-2.5 group-hover:border-emerald-400/40 group-hover:from-emerald-500/15 group-hover:to-blue-500/15 transition-all">
                        <span className="text-sm font-semibold text-emerald-300 group-hover:text-emerald-200 transition-colors">Open Game Panel</span>
                        <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
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

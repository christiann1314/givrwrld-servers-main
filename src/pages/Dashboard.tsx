
import * as React from 'react';
import { Link } from 'react-router-dom';
// Footer is included in App.tsx
import { useUserServers } from '../hooks/useUserServers';
import { useUserStats } from '../hooks/useUserStats';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { analytics } from '../services/analytics';
import { useLiveServerData } from '../hooks/useLiveServerData';
import { useLiveBillingData } from '../hooks/useLiveBillingData';
import { ENV } from '@/config/env';
import { 
  Server, 
  CreditCard, 
  Settings, 
  LifeBuoy, 
  Activity,
  Plus,
  ChevronRight,
  BarChart3,
  ShoppingCart,
  UserPlus,
  Users,
  HeadphonesIcon,
  Menu,
  X
} from 'lucide-react';

// Secure server icon component to prevent XSS
const ServerIcon = ({ server }: { server: any }) => {
  const candidates = Array.isArray(server.gameIconCandidates)
    ? server.gameIconCandidates.filter(Boolean)
    : [server.gameIcon].filter(Boolean);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [exhausted, setExhausted] = React.useState(candidates.length === 0);

  React.useEffect(() => {
    setCurrentIndex(0);
    setExhausted(candidates.length === 0);
  }, [server.id, server.game, candidates.length]);

  const fallbackText = String(server.game || 'game').slice(0, 2).toUpperCase();

  return (
    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden border-2 border-emerald-500/50 bg-gray-800/50 flex items-center justify-center">
      {!exhausted ? (
        <img 
          src={candidates[currentIndex]}
          alt={server.game || 'Game server'}
          className="w-full h-full object-cover rounded-md"
          onError={() => {
            const next = currentIndex + 1;
            if (next < candidates.length) {
              setCurrentIndex(next);
            } else {
              setExhausted(true);
            }
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-emerald-500/25 to-cyan-500/20 flex items-center justify-center">
          <span className="text-sm lg:text-base font-bold text-emerald-200">{fallbackText}</span>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  // Import useAuth to get authenticated user
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const userEmail = user?.email || null;
  const displayName =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    user?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';
  
  const { serversData } = useUserServers(userEmail);
  const { userStats } = useUserStats(userEmail);
  const { data: liveServerData, refresh: refreshServers } = useLiveServerData(30000);
  const { data: liveBillingData, refresh: refreshBilling } = useLiveBillingData(60000);

  // Show loading state when no user email
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading user data...</div>
      </div>
    );
  }

  // Game icon mapping based on game type
  const normalizeGameSlug = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/_/g, '-');

  const GAME_ICON_CANDIDATES: Record<string, string[]> = {
    minecraft: [
      '/images/efe9d97d-94d9-4596-b1d7-99f242301c96.png',
      'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg',
    ],
    palworld: [
      '/images/a7264f37-06a0-45bc-8cd0-62289aa4eff8.png',
      'https://cdn.akamai.steamstatic.com/steam/apps/1623730/library_hero.jpg',
    ],
    rust: [
      '/images/fb115f3f-774a-4094-a15a-b21b90860c1c.png',
      'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
    ],
    ark: ['https://cdn.akamai.steamstatic.com/steam/apps/2399830/library_hero.jpg'],
    terraria: ['https://cdn.akamai.steamstatic.com/steam/apps/105600/library_hero.jpg'],
    factorio: ['https://cdn.akamai.steamstatic.com/steam/apps/427520/library_hero.jpg'],
    mindustry: ['https://cdn.akamai.steamstatic.com/steam/apps/1127400/library_hero.jpg'],
    rimworld: ['https://cdn.akamai.steamstatic.com/steam/apps/294100/library_hero.jpg'],
    'vintage-story': ['https://cdn.akamai.steamstatic.com/steam/apps/1608230/library_hero.jpg'],
    teeworlds: ['https://cdn.akamai.steamstatic.com/steam/apps/380840/library_hero.jpg'],
    'among-us': ['https://cdn.akamai.steamstatic.com/steam/apps/945360/library_hero.jpg'],
    veloren: ['https://gitlab.com/veloren/book/-/raw/master/src/contributors/journalists/data/screenshots/Savannah%20Exploration.jpg'],
  };

  const getGameIconCandidates = (gameType: string) => {
    const slug = normalizeGameSlug(gameType);
    const aliases: Record<string, string> = {
      amongus: 'among-us',
      vintagestory: 'vintage-story',
    };
    const key = aliases[slug] || slug;
    return GAME_ICON_CANDIDATES[key] || GAME_ICON_CANDIDATES.minecraft;
  };

  const rawServers = (liveServerData?.servers && liveServerData.servers.length > 0)
    ? liveServerData.servers
    : serversData.servers;

  const servers = rawServers.map((server: any) => {
    const gameLabel = server.game_type || server.game || server.plan_id?.split?.('-')?.[0] || 'minecraft';
    const candidates = getGameIconCandidates(gameLabel);
    const ram = server.ram || (server.ram_gb ? `${server.ram_gb}GB` : null);
    const cpu = server.cpu || (server.vcores ? `${server.vcores} vCPU` : null);
    const location = server.location || server.region || 'us-east';
    const specs = server.specs || [ram, cpu, location].filter(Boolean).join(' • ');

    return {
      ...server,
      game: gameLabel,
      specs,
      icon: '🎮',
      gameIcon: candidates[0],
      gameIconCandidates: candidates,
    };
  });

  const quickActions = [
    { title: "Order New Server", icon: Plus, color: "emerald", link: "/dashboard/order" },
    { title: "View Billing", icon: CreditCard, color: "blue", link: "/dashboard/billing" },
    { title: "Create Support Ticket", icon: LifeBuoy, color: "gray", link: "/dashboard/support" },
    { title: "View Affiliate Program", icon: UserPlus, color: "purple", link: "/dashboard/affiliate" }
  ];

  const sidebarItems = [
    { name: "Overview", icon: BarChart3, link: "/dashboard", active: true },
    { name: "My Services", icon: Server, link: "/dashboard/services" },
    { name: "Billing", icon: CreditCard, link: "/dashboard/billing" },
    { name: "Support", icon: HeadphonesIcon, link: "/dashboard/support" },
    { name: "Affiliate", icon: Users, link: "/dashboard/affiliate" },
    { name: "Order Services", icon: ShoppingCart, link: "/dashboard/order" },
    { name: "Settings", icon: Settings, link: "/dashboard/settings" }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Sword Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/32 to-gray-900/58"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex relative">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`
            fixed lg:relative 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            transition-transform duration-300 ease-in-out
            w-80 lg:w-80 min-h-screen 
            glass-panel-strong border-r border-gray-600/50 
            z-50 lg:z-auto
            overflow-y-auto
          `}>
            <div className="p-4 lg:p-6">
              {/* Mobile Close Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="mb-6 lg:mb-8">
                <h1 className="text-xl lg:text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    Welcome back, {displayName}
                  </span>
                </h1>
                <p className="text-gray-400 text-sm">Manage your servers, billing, and account settings</p>
              </div>

              <nav className="space-y-2">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.link}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      item.active 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-8 w-full">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mb-4 p-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-gray-300 hover:text-white"
            >
              <Menu size={20} />
            </button>

            {/* Welcome Section + Quick access */}
            <div className="glass-panel-strong rounded-xl p-6 lg:p-8 mb-6 lg:mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                    Welcome back, {displayName}!
                  </h1>
                  <p className="text-gray-300 text-lg">
                    Manage your servers, billing, and account settings
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-emerald-400">
                      🚀 Live Data Active — {new Date().toLocaleTimeString()}
                    </span>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={() => {
                        analytics.trackGamePanelAccess(user?.id || '', 'main-panel');
                        window.open(ENV.PANEL_URL, '_blank');
                      }}
                      className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Server size={16} />
                      Open Game Panel
                      <ChevronRight size={14} className="opacity-80" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                  <div className="text-center lg:text-right">
                    <div className="text-2xl font-bold text-emerald-400">{liveServerData?.onlineServers ?? servers.length}</div>
                    <div className="text-gray-400 text-sm">Online Servers</div>
                  </div>
                  <div className="text-center lg:text-right">
                    <div className="text-2xl font-bold text-blue-400">
                      {liveBillingData?.totalRevenue !== undefined
                        ? `$${liveBillingData.totalRevenue.toFixed(2)}`
                        : (userStats?.totalSpent || '$0.00')}
                    </div>
                    <div className="text-gray-400 text-sm">Total Spent</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Servers */}
            <div className="mt-6 lg:mt-8 glass-panel-strong rounded-xl p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-4">
                <div className="flex items-center">
                  <Server className="text-emerald-400 mr-3" size={20} />
                  <h2 className="text-lg lg:text-xl font-bold text-white">Your Active Servers</h2>
                </div>
                <Link 
                  to="/dashboard/order"
                  className="btn-primary text-white px-4 py-2 rounded-lg transition-all flex items-center text-sm justify-center sm:justify-start"
                >
                  <Plus size={16} className="mr-2" />
                  Order New Server
                </Link>
              </div>
              
              <div className="space-y-4">
                {servers.length === 0 && (
                  <div className="text-center py-12 px-4 bg-gray-700/20 rounded-lg border border-gray-600/30">
                    <Server className="mx-auto mb-4 text-gray-500" size={48} />
                    <h3 className="text-lg font-semibold text-white mb-2">No servers yet</h3>
                    <p className="text-gray-400 mb-4 max-w-sm mx-auto">Deploy your first game server in a few clicks. Choose a game, pick a plan, and you’re ready to play.</p>
                    <Link
                      to="/deploy"
                      className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                      <Plus size={18} className="mr-2" />
                      Deploy your first server
                    </Link>
                  </div>
                )}
                {servers.map((server) => (
                  <div key={server.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-700/30 rounded-lg gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="relative flex-shrink-0">
                          <ServerIcon server={server} />
                        </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-base lg:text-lg truncate">{server.name}</h3>
                        <p className="text-gray-400 text-sm">{server.game}</p>
                        <p className="text-gray-500 text-xs truncate">{server.specs}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 justify-between sm:justify-end">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {server.status}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/success?order_id=${encodeURIComponent(server.id)}`}
                          className="bg-gray-600/40 hover:bg-gray-600/60 text-gray-200 hover:text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors border border-gray-500/50"
                        >
                          View confirmation
                        </Link>
                        <a 
                          href={server.pterodactylUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            analytics.trackGamePanelAccess(user?.id || '', server.id);
                          }}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-lg text-sm font-medium transition-colors border border-emerald-500/30"
                        >
                          Game Panel
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer is included in App.tsx */}
      </div>
    </div>
  );
};

export default Dashboard;

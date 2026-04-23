import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  Server,
  CreditCard,
  Settings,
  Users,
  BarChart3,
  ShoppingCart,
  HeadphonesIcon,
  ChevronLeft,
} from 'lucide-react';

const DashboardOrder = () => {
  const [gameCards, setGameCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const sidebarItems = [
    { name: 'Overview', icon: BarChart3, link: '/dashboard', active: false },
    { name: 'Game Panel', icon: Server, link: '/dashboard/services' },
    { name: 'Billing', icon: CreditCard, link: '/dashboard/billing' },
    { name: 'Support', icon: HeadphonesIcon, link: '/dashboard/support' },
    { name: 'Affiliate', icon: Users, link: '/dashboard/affiliate' },
    { name: 'Order Services', icon: ShoppingCart, link: '/dashboard/order', active: true },
    { name: 'Settings', icon: Settings, link: '/dashboard/settings' },
  ];

  const GAME_DISPLAY: Record<string, { name: string; subtitle: string; image: string; configPath: string }> = {
    minecraft: {
      name: 'Minecraft',
      subtitle: 'Build, explore, survive',
      image: 'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg',
      configPath: '/configure/minecraft',
    },
    rust: {
      name: 'Rust',
      subtitle: 'Survival multiplayer game',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
      configPath: '/configure/rust',
    },
    palworld: {
      name: 'Palworld',
      subtitle: 'Creature collection survival',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1623730/library_hero.jpg',
      configPath: '/configure/palworld',
    },
    ark: {
      name: 'ARK: Survival Evolved',
      subtitle: 'Dinosaurs, tribes, and survival',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/2399830/library_hero.jpg',
      configPath: '/configure/ark',
    },
    'ark-asa': {
      name: 'ARK: Survival Ascended',
      subtitle: 'UE5 dinosaurs and survival',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1874880/library_hero.jpg',
      configPath: '/configure/ark-asa',
    },
    'counter-strike': {
      name: 'Counter-Strike',
      subtitle: 'CS:GO dedicated servers',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg',
      configPath: '/configure/counter-strike',
    },
    terraria: {
      name: 'Terraria',
      subtitle: '2D sandbox adventure hosting',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/105600/library_hero.jpg',
      configPath: '/configure/terraria',
    },
    factorio: {
      name: 'Factorio',
      subtitle: 'Automation and factory multiplayer',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/427520/library_hero.jpg',
      configPath: '/configure/factorio',
    },
    mindustry: {
      name: 'Mindustry',
      subtitle: 'Tower defense and automation',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1127400/library_hero.jpg',
      configPath: '/configure/mindustry',
    },
    rimworld: {
      name: 'RimWorld',
      subtitle: 'Colony sim multiplayer hosting',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/294100/library_hero.jpg',
      configPath: '/configure/rimworld',
    },
    'vintage-story': {
      name: 'Vintage Story',
      subtitle: 'Hardcore survival sandbox',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1608230/library_hero.jpg',
      configPath: '/configure/vintage-story',
    },
    teeworlds: {
      name: 'Teeworlds',
      subtitle: 'Fast-paced 2D arena servers',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/380840/library_hero.jpg',
      configPath: '/configure/teeworlds',
    },
    'among-us': {
      name: 'Among Us',
      subtitle: 'Impostor dedicated server',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/945360/library_hero.jpg',
      configPath: '/configure/among-us',
    },
    veloren: {
      name: 'Veloren',
      subtitle: 'Open-world voxel RPG',
      image: '/images/veloren-hero.jpg',
      configPath: '/configure/veloren',
    },
    enshrouded: {
      name: 'Enshrouded',
      subtitle: 'Survival, crafting & action RPG',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1203620/library_hero.jpg',
      configPath: '/configure/enshrouded',
    },
  };

  React.useEffect(() => {
    let active = true;
    const loadCards = async () => {
      try {
        const response = await api.getPlans();
        if (!active || !response?.success) return;
        const gamePlans = (response?.plans || []).filter((p: any) => p.item_type === 'game' && Number(p.is_active) === 1);
        const byGame = new Map<string, any[]>();
        gamePlans.forEach((plan: any) => {
          const key = String(plan.game || '').toLowerCase();
          if (!key) return;
          byGame.set(key, [...(byGame.get(key) || []), plan]);
        });
        const cards = Array.from(byGame.entries()).map(([game, plans]) => {
          const sorted = [...plans].sort((a: any, b: any) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));
          const starter = sorted[0];
          const meta = GAME_DISPLAY[game] || {
            name: game.charAt(0).toUpperCase() + game.slice(1),
            subtitle: 'Premium game server hosting',
            image: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
            configPath: `/configure/${game}`,
          };
          return {
            id: game,
            name: meta.name,
            subtitle: meta.subtitle,
            image: meta.image,
            configPath: meta.configPath,
            price: Number(starter?.price_monthly || 0),
            ram: Number(starter?.ram_gb || 0),
            cpu: Number(starter?.vcores || 0),
            disk: Number(starter?.ssd_gb || 0),
          };
        });
        if (active) setGameCards(cards);
      } finally {
        if (active) setCardsLoading(false);
      }
    };
    loadCards();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
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
        <div className="flex">
          <div className="w-80 min-h-screen glass-panel-strong border-r border-gray-600/50">
            <div className="p-6">
              <div className="mb-8">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-black/55 text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition-colors mb-4"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    Order Services
                  </span>
                </h1>
                <p className="text-gray-400 text-sm">Deploy new game servers from our catalog</p>
              </div>

              <nav className="space-y-2">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.link}
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

          <div className="flex-1 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Order Services
                </span>
              </h2>
              <p className="text-gray-300 text-lg">Browse games and deploy a new server</p>
            </div>

            <div>
              {cardsLoading && <div className="text-gray-300 mb-6">Loading game offerings...</div>}
              {!cardsLoading && gameCards.length === 0 && (
                <div className="text-yellow-300 mb-6">No active game plans found yet.</div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {gameCards.map((server) => (
                  <div
                    key={server.id}
                    className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10"
                  >
                    <div className="h-48 relative overflow-hidden">
                      <img src={server.image} alt={server.name} className="w-full h-full object-cover object-center" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-xl font-bold text-white drop-shadow-md">{server.name}</h3>
                        <p className="text-gray-200 text-xs drop-shadow-md">{server.subtitle}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-1 mb-4 text-sm">
                        <div className="text-emerald-300">Starts at ${server.price.toFixed(2)}/mo</div>
                        <div className="text-gray-400">
                          {server.ram}GB RAM • {server.cpu} vCPU • {server.disk}GB NVMe
                        </div>
                      </div>
                      <Link
                        to={server.configPath}
                        className="block w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 text-center"
                      >
                        Deploy Server
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOrder;

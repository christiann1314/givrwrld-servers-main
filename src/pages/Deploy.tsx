import React from 'react';
// Header and Footer are included in App.tsx
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

type DeployCard = {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  features: string[];
  price: string;
  buttonText: string;
  buttonColor: string;
  configPath: string;
};

/** Wedge games shown first on Deploy; game-specific bullets (RAM/slot, mod-friendly, etc.). */
const WEDGE_GAME_IDS = ['minecraft', 'rust', 'palworld'];

const GAME_DISPLAY: Record<string, Partial<DeployCard>> = {
  minecraft: {
    name: 'Minecraft',
    subtitle: 'Build, explore, survive',
    image: 'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg',
    features: ['Plugin & mod support', '4–8GB for modded, 2–4GB vanilla', 'Ryzen 7 9800X3D', 'Java & Bedrock'],
    buttonColor: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500',
    configPath: '/configure/minecraft',
  },
  rust: {
    name: 'Rust',
    subtitle: 'Survival multiplayer game',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
    features: ['Small to large servers', 'Mod-friendly, Oxide/uMod', 'Ryzen 7 9800X3D', 'NVMe storage'],
    buttonColor: 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500',
    configPath: '/configure/rust',
  },
  palworld: {
    name: 'Palworld',
    subtitle: 'Creature collection survival',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1623730/library_hero.jpg',
    features: ['4–6 players typical', 'Dedicated Palworld egg', 'Ryzen 7 9800X3D', 'Fast deployment'],
    buttonColor: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500',
    configPath: '/configure/palworld',
  },
  ark: {
    name: 'ARK',
    subtitle: 'Dinosaurs, tribes, and survival',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/2399830/library_hero.jpg',
    features: ['PvE and PvP clusters', 'Fast storage', 'Instant deployment'],
    buttonColor: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500',
    configPath: '/configure/ark',
  },
  terraria: {
    name: 'Terraria',
    subtitle: '2D sandbox adventure hosting',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/105600/library_hero.jpg',
    features: ['TShock friendly', 'Low-latency hosting', 'Quick setup'],
    buttonColor: 'bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500',
    configPath: '/configure/terraria',
  },
  factorio: {
    name: 'Factorio',
    subtitle: 'Automation and factory multiplayer',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/427520/library_hero.jpg',
    features: ['Mod support', 'Autosaves', 'High tick stability'],
    buttonColor: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500',
    configPath: '/configure/factorio',
  },
  mindustry: {
    name: 'Mindustry',
    subtitle: 'Tower defense and automation',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1127400/library_hero.jpg',
    features: ['Public or private worlds', 'Fast startup', 'Simple scaling'],
    buttonColor: 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500',
    configPath: '/configure/mindustry',
  },
  rimworld: {
    name: 'RimWorld',
    subtitle: 'Colony sim multiplayer hosting',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/294100/library_hero.jpg',
    features: ['Mod list friendly', 'Reliable uptime', 'Quick deploy'],
    buttonColor: 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500',
    configPath: '/configure/rimworld',
  },
  'vintage-story': {
    name: 'Vintage Story',
    subtitle: 'Hardcore survival sandbox',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1608230/library_hero.jpg',
    features: ['Persistent worlds', 'Configurable saves', 'Premium CPU'],
    buttonColor: 'bg-gradient-to-r from-stone-500 to-zinc-600 hover:from-stone-400 hover:to-zinc-500',
    configPath: '/configure/vintage-story',
  },
  teeworlds: {
    name: 'Teeworlds',
    subtitle: 'Fast-paced 2D arena servers',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/380840/library_hero.jpg',
    features: ['Low resource footprint', 'Great latency', 'Quick spin-up'],
    buttonColor: 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500',
    configPath: '/configure/teeworlds',
  },
  'among-us': {
    name: 'Among Us',
    subtitle: 'Social deduction game hosting',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/945360/library_hero.jpg',
    features: ['Private lobby hosting', 'Simple setup', 'Low monthly cost'],
    buttonColor: 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500',
    configPath: '/configure/among-us',
  },
  veloren: {
    name: 'Veloren',
    subtitle: 'Open-world voxel RPG',
    image: 'https://gitlab.com/veloren/book/-/raw/master/src/contributors/journalists/data/screenshots/Savannah%20Exploration.jpg',
    features: ['Community server ready', 'Fast NVMe storage', 'Scalable tiers'],
    buttonColor: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500',
    configPath: '/configure/veloren',
  },
  enshrouded: {
    name: 'Enshrouded',
    subtitle: 'Survival, crafting & action RPG',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1203620/library_hero.jpg',
    features: ['Up to 16 players', 'Vanilla & modded support', 'Ryzen 7 9800X3D', 'Fast deployment'],
    buttonColor: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500',
    configPath: '/configure/enshrouded',
  },
};

/** Fallback cards from GAME_DISPLAY when API returns no plans (all 12 games always show). */
function getFallbackCards(): DeployCard[] {
  return Object.entries(GAME_DISPLAY).map(([game, meta]) => ({
    id: game,
    name: meta.name || game.charAt(0).toUpperCase() + game.slice(1),
    subtitle: meta.subtitle || 'Premium game server hosting',
    image: meta.image || 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
    features: meta.features || ['Instant setup', '24/7 support', 'Premium hardware'],
    price: 'See plans',
    buttonText: `Deploy ${meta.name || game} Server`,
    buttonColor: meta.buttonColor || 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500',
    configPath: meta.configPath || `/configure/${game}`,
  }));
}

const Deploy = () => {
  const [gameServers, setGameServers] = React.useState<DeployCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const loadFromBackend = async () => {
      try {
        const response = await api.getPlans();
        const plans = response?.success ? (response?.plans || []) : [];
        const activeGamePlans = plans.filter((p: any) => p?.item_type === 'game' && Number(p?.is_active) === 1);

        const byGame = new Map<string, any[]>();
        activeGamePlans.forEach((p: any) => {
          const key = String(p?.game || '').toLowerCase();
          if (!key) return;
          byGame.set(key, [...(byGame.get(key) || []), p]);
        });

        const cards: DeployCard[] = Array.from(byGame.entries()).map(([game, gamePlans]) => {
          const sorted = [...gamePlans].sort((a: any, b: any) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));
          const starter = sorted[0];
          const meta = GAME_DISPLAY[game] || {};
          const title = meta.name || game.charAt(0).toUpperCase() + game.slice(1);
          return {
            id: game,
            name: title,
            subtitle: meta.subtitle || 'Premium game server hosting',
            image: meta.image || 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg',
            features: meta.features || [`Starts with ${starter.ram_gb}GB RAM`, `${starter.vcores} vCPU`, `${starter.ssd_gb}GB NVMe`],
            price: `$${Number(starter.price_monthly || 0).toFixed(2)}`,
            buttonText: `Deploy ${title} Server`,
            buttonColor: meta.buttonColor || 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500',
            configPath: meta.configPath || `/configure/${game}`,
          };
        });

        if (active) {
          const list = cards.length > 0 ? cards : getFallbackCards();
          const wedgeFirst = [...list].sort((a, b) => {
            const aIdx = WEDGE_GAME_IDS.indexOf(a.id);
            const bIdx = WEDGE_GAME_IDS.indexOf(b.id);
            if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
            if (aIdx >= 0) return -1;
            if (bIdx >= 0) return 1;
            return a.id.localeCompare(b.id);
          });
          setGameServers(wedgeFirst);
        }
      } catch (error) {
        console.error('Failed to load deploy cards from backend plans:', error);
        if (active) setGameServers(getFallbackCards());
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFromBackend();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/48 via-gray-900/30 to-gray-900/56"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-amber-800/8"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header is included in App.tsx */}
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors mb-6">
              ← Back to Home
            </Link>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Deploy Your Game Server
            </span>
          </h1>
          
          <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-2">
            Choose your game and get started instantly. Premium hosting with
            instant setup and 24/7 support.
          </p>
          <p className="text-base text-gray-200 max-w-2xl mx-auto mb-16">
            DDoS mitigation is included for all game servers.
          </p>
        </section>

        {/* Game Server Cards */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {loading && (
            <div className="text-center text-gray-100 text-base mb-8">Loading available game plans...</div>
          )}
          {!loading && gameServers.length === 0 && (
            <div className="text-center text-yellow-300 mb-8">
              No active game plans found in local backend. Add plans in MariaDB to continue.
            </div>
          )}
          {!loading && gameServers.length > 0 && (
            <p className="text-gray-200 text-base mb-6">
              Featured: Minecraft, Rust, and Palworld — then choose from more games below.
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
            {gameServers.map((server) => (
              <div key={server.id} className="bg-gray-800/90 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10">
                {/* Game Image */}
                <div className="h-56 sm:h-60 lg:h-64 relative overflow-hidden">
                  <img 
                    src={server.image}
                    alt={server.name}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">{server.name}</h3>
                    <p className="text-gray-200 text-base drop-shadow-lg">{server.subtitle}</p>
                  </div>
                </div>

                {/* Server Details */}
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    {server.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-gray-100 text-base">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="text-2xl font-bold text-white mb-1">
                      Starting at {server.price}
                      <span className="text-base font-normal text-gray-200 ml-1">/month</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      NVMe • Ryzen 7 9800X3D
                    </div>
                  </div>

                  {/* Deploy Button */}
                  <Link 
                    to={server.configPath}
                    className={`block w-full ${server.buttonColor} text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center`}
                  >
                    {server.buttonText}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Not sure which to choose?</h2>
            <p className="text-gray-100 text-base mb-8 max-w-2xl mx-auto">
              All options come with 24/7 support, instant setup, and premium hardware. You 
              can always upgrade or switch plans later.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/discord"
                className="bg-gray-700/60 hover:bg-gray-600/60 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 border border-gray-600/50 hover:border-emerald-500/50"
              >
                Ask Our Community
              </Link>
              <Link 
                to="/support"
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

        {/* Footer is included in App.tsx */}
      </div>
    </div>
  );
};

export default Deploy;

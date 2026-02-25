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
  Zap,
  Check
} from 'lucide-react';
import UpgradePaymentModal from '../components/UpgradePaymentModal';

const DashboardOrder = () => {
  const [activeTab, setActiveTab] = useState('servers');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [gameCards, setGameCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const sidebarItems = [
    { name: "Overview", icon: BarChart3, link: "/dashboard", active: false },
    { name: "My Services", icon: Server, link: "/dashboard/services" },
    { name: "Billing", icon: CreditCard, link: "/dashboard/billing" },
    { name: "Support", icon: HeadphonesIcon, link: "/dashboard/support" },
    { name: "Affiliate", icon: Users, link: "/dashboard/affiliate" },
    { name: "Order Services", icon: ShoppingCart, link: "/dashboard/order", active: true },
    { name: "Settings", icon: Settings, link: "/dashboard/settings" }
  ];

  const GAME_DISPLAY: Record<string, { name: string; subtitle: string; image: string; configPath: string }> = {
    minecraft: { name: 'Minecraft', subtitle: 'Build, explore, survive', image: 'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg', configPath: '/configure/minecraft' },
    rust: { name: 'Rust', subtitle: 'Survival multiplayer game', image: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/library_hero.jpg', configPath: '/configure/rust' },
    palworld: { name: 'Palworld', subtitle: 'Creature collection survival', image: 'https://cdn.akamai.steamstatic.com/steam/apps/1623730/library_hero.jpg', configPath: '/configure/palworld' },
    ark: { name: 'ARK', subtitle: 'Dinosaurs, tribes, and survival', image: 'https://cdn.akamai.steamstatic.com/steam/apps/2399830/library_hero.jpg', configPath: '/configure/ark' },
    terraria: { name: 'Terraria', subtitle: '2D sandbox adventure hosting', image: 'https://cdn.akamai.steamstatic.com/steam/apps/105600/library_hero.jpg', configPath: '/configure/terraria' },
    factorio: { name: 'Factorio', subtitle: 'Automation and factory multiplayer', image: 'https://cdn.akamai.steamstatic.com/steam/apps/427520/library_hero.jpg', configPath: '/configure/factorio' },
    mindustry: { name: 'Mindustry', subtitle: 'Tower defense and automation', image: 'https://cdn.akamai.steamstatic.com/steam/apps/1127400/library_hero.jpg', configPath: '/configure/mindustry' },
    rimworld: { name: 'RimWorld', subtitle: 'Colony sim multiplayer hosting', image: 'https://cdn.akamai.steamstatic.com/steam/apps/294100/library_hero.jpg', configPath: '/configure/rimworld' },
    'vintage-story': { name: 'Vintage Story', subtitle: 'Hardcore survival sandbox', image: 'https://cdn.akamai.steamstatic.com/steam/apps/1608230/library_hero.jpg', configPath: '/configure/vintage-story' },
    teeworlds: { name: 'Teeworlds', subtitle: 'Fast-paced 2D arena servers', image: 'https://cdn.akamai.steamstatic.com/steam/apps/380840/library_hero.jpg', configPath: '/configure/teeworlds' },
    'among-us': { name: 'Among Us', subtitle: 'Social deduction game hosting', image: 'https://cdn.akamai.steamstatic.com/steam/apps/945360/library_hero.jpg', configPath: '/configure/among-us' },
    veloren: { name: 'Veloren', subtitle: 'Open-world voxel RPG', image: 'https://gitlab.com/veloren/book/-/raw/master/src/contributors/journalists/data/screenshots/Savannah%20Exploration.jpg', configPath: '/configure/veloren' },
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

  const upgradePackages = [
    {
      id: 'givrwrld-essentials',
      name: 'GIVRwrld Essentials',
      price: '$6.99',
      description: 'per month',
      features: [
        'Complete server management toolkit',
        'Daily automatic backups',
        'Discord bridge integration',
        'Analytics dashboard',
        'Priority support queue',
        'Custom domain support'
      ],
      buttonColor: 'emerald',
      link: '/upgrade/givrwrld-essentials'
    },
    {
      id: 'game-expansion',
      name: 'Game Expansion Pack',
      price: '$14.99',
      description: 'per month',
      features: [
        'Cross-deploy to multiple game types',
        'Shared resource allocation',
        'Cross-game player management',
        'Advanced networking tools',
        'Multi-server dashboard',
        'Load balancing'
      ],
      buttonColor: 'blue',
      popular: true,
      link: '/upgrade/game-expansion-pack'
    },
    {
      id: 'community-pack',
      name: 'Community Pack',
      price: '$4.99',
      description: 'per month',
      features: [
        'Connect with creators',
        'Creator spotlights',
        'Dev blog access',
        'Priority support',
        'Community forums access',
        'Beta feature access'
      ],
      buttonColor: 'purple',
      link: '/upgrade/community-pack'
    }
  ];

  const addonCategories = [
    {
      id: 'performance',
      name: 'Performance',
      addons: [
        {
          id: 'cpu-boost',
          planId: 'addon-cpu-boost-1vcpu',
          name: 'CPU Boost (+1 vCPU)',
          price: '$5.99/mo',
          description: 'Improve tick stability and reduce lag spikes during peak usage.',
          features: ['+1 dedicated vCPU', 'Smoother gameplay', 'Instant provision'],
        },
        {
          id: 'priority-resource-allocation',
          planId: 'addon-priority-resource-allocation',
          name: 'Priority Resource Allocation',
          price: '$4.99/mo',
          description: 'Prioritize your workloads during shared node contention windows.',
          features: ['Priority scheduling', 'Lower contention impact', 'Consistent response'],
        },
      ],
    },
    {
      id: 'storage',
      name: 'Storage',
      addons: [
        {
          id: 'additional-ssd',
          planId: 'addon-additional-ssd-50gb',
          name: 'Additional SSD (+50GB)',
          price: '$3.99/mo',
          description: 'Add extra high-speed storage for worlds, saves, and modpacks.',
          features: ['+50GB NVMe storage', 'High throughput', 'Scales with your server'],
        },
        {
          id: 'enhanced-backup-retention',
          planId: 'addon-enhanced-backup-retention',
          name: 'Enhanced Backup Retention',
          price: '$3.99/mo',
          description: 'Keep restore points longer to protect high-value server states.',
          features: ['Longer retention windows', 'Faster rollback confidence', 'Safer updates'],
        },
      ],
    },
    {
      id: 'community',
      name: 'Community',
      addons: [
        {
          id: 'discord-integration',
          planId: 'addon-discord-integration',
          name: 'Discord Integration',
          price: '$2.99/mo',
          description: 'Connect status updates and alerts to your Discord community.',
          features: ['Status notifications', 'Community visibility', 'Alert automation'],
        },
        {
          id: 'pro-analytics',
          planId: 'addon-pro-analytics',
          name: 'Pro Analytics',
          price: '$5.99/mo',
          description: 'Track trends and usage with premium performance analytics.',
          features: ['Performance trends', 'Usage insights', 'Executive dashboard views'],
        },
      ],
    },
    {
      id: 'admin-tools',
      name: 'Admin Tools',
      addons: [
        {
          id: 'extra-database',
          planId: 'addon-extra-database',
          name: 'Extra Database',
          price: '$2.49/mo',
          description: 'Provision one additional managed database for plugins/tools.',
          features: ['+1 managed DB', 'Fast provisioning', 'Plugin-ready'],
        },
        {
          id: 'extra-port-allocation',
          planId: 'addon-extra-port-allocation',
          name: 'Extra Port Allocation',
          price: '$1.99/mo',
          description: 'Add one more network port allocation for advanced setups.',
          features: ['+1 port allocation', 'Flexible routing', 'Operational headroom'],
        },
      ],
    },
  ];

  const tabs = [
    { id: 'servers', label: 'Game Servers', icon: Server },
    { id: 'upgrades', label: 'Upgrades & Add-ons', icon: Zap }
  ];

  const handlePurchaseAddon = (addon) => {
    setSelectedPackage({
      name: addon.name,
      price: addon.price,
      planId: addon.planId,
      itemType: 'vps',
      features: addon.features
    });
    setPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Sword Background */}
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
          {/* Sidebar */}
          <div className="w-80 min-h-screen glass-panel-strong border-r border-gray-600/50">
            <div className="p-6">
              <div className="mb-8">
                <Link 
                  to="/dashboard"
                  className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors mb-4"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    Order Services
                  </span>
                </h1>
                <p className="text-gray-400 text-sm">Deploy new servers and upgrade your existing services</p>
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

          {/* Main Content */}
          <div className="flex-1 p-8">
            {/* Header Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Order Services
                </span>
              </h2>
              <p className="text-gray-300 text-lg">
                Deploy new servers and upgrade your existing services
              </p>
            </div>

            {/* Tabs */}
            <div className="mb-8">
              <div className="flex space-x-4 border-b border-gray-600/50">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 font-medium transition-all duration-200 border-b-2 ${
                      activeTab === tab.id
                        ? 'text-emerald-400 border-emerald-400'
                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
                    }`}
                  >
                    <tab.icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Game Servers Tab */}
            {activeTab === 'servers' && (
              <div>
                {cardsLoading && (
                  <div className="text-gray-300 mb-6">Loading game offerings...</div>
                )}
                {!cardsLoading && gameCards.length === 0 && (
                  <div className="text-yellow-300 mb-6">No active game plans found yet.</div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                  {gameCards.map((server) => (
                    <div key={server.id} className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10">
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
                          <div className="text-gray-400">{server.ram}GB RAM • {server.cpu} vCPU • {server.disk}GB NVMe</div>
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
            )}

            {/* Upgrades & Add-ons Tab */}
            {activeTab === 'upgrades' && (
              <div className="space-y-8 mb-12">
                {/* Upgrade Packages */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Upgrade Packages</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upgradePackages.map((pkg) => (
                      <div key={pkg.id} className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10 relative">
                        {pkg.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center mb-6">
                          <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                          <div className="text-3xl font-bold text-emerald-400 mb-1">{pkg.price}</div>
                          <div className="text-gray-400 text-sm">{pkg.description}</div>
                        </div>

                        <div className="space-y-3 mb-6">
                          {pkg.features.map((feature, index) => (
                            <div key={index} className="flex items-center text-gray-300 text-sm">
                              <Check size={16} className="text-emerald-400 mr-3 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <Link 
                          to={pkg.link}
                          className={`block w-full text-center font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                            pkg.buttonColor === 'emerald' 
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/25'
                              : pkg.buttonColor === 'blue'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/25'
                              : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-purple-500/25'
                          }`}
                        >
                          Add Upgrade
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Add-ons */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Optional Add-ons</h3>
                  <div className="space-y-8">
                    {addonCategories.map((category) => (
                      <div key={category.id}>
                        <h4 className="text-lg font-semibold text-emerald-300 mb-4">{category.name}</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                          {category.addons.map((addon) => (
                            <div key={addon.id} className="bg-gray-800/40 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 hover:border-emerald-500/30 transition-all duration-300">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h5 className="text-xl font-bold text-white mb-2">{addon.name}</h5>
                                  <p className="text-gray-300 text-sm mb-3">{addon.description}</p>
                                  <div className="text-emerald-400 font-bold text-lg">{addon.price}</div>
                                </div>
                              </div>
                              <div className="space-y-2 mb-6">
                                {addon.features.map((feature, index) => (
                                  <div key={index} className="flex items-center text-gray-300 text-sm">
                                    <Check size={14} className="text-emerald-400 mr-2 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => handlePurchaseAddon(addon)}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300"
                              >
                                Add to Subscription
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        
      </div>

      {/* Payment Modal */}
      {selectedPackage && (
        <UpgradePaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPackage(null);
          }}
          packageData={selectedPackage}
        />
      )}
    </div>
  );
};

export default DashboardOrder;

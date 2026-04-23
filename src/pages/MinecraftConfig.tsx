import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAction } from '../hooks/useAction';
import { stripeService } from '../services/stripeService';
import {
  useGamePlanCatalog,
  planCardTitle,
  planIncludesAutoBackups,
  isRetailVanillaGameTypeId,
} from '@/hooks/useGamePlanCatalog';
import { useNavigate } from 'react-router-dom';
import { GameTransparencySection } from '@/components/GameTransparencySection';
const minecraftWallpaper = 'https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg';

const fallbackPlans = [
  { id: 'mc-paper-2gb', name: '2 GB', ram: '2 GB', cpu: '1 vCPU', disk: '10 GB NVMe', price: 6.99, players: '2-8', description: '', serverType: 'minecraft-paper' },
  { id: 'mc-paper-4gb', name: '4 GB', ram: '4 GB', cpu: '1 vCPU', disk: '20 GB NVMe', price: 13.99, players: '4-16', description: '', serverType: 'minecraft-paper' },
  { id: 'mc-paper-8gb', name: '8 GB', ram: '8 GB', cpu: '2 vCPU', disk: '30 GB NVMe', price: 27.99, players: '8-32', description: '', recommended: true, serverType: 'minecraft-paper' },
  { id: 'mc-paper-12gb', name: '12 GB', ram: '12 GB', cpu: '2 vCPU', disk: '50 GB NVMe', price: 36.99, players: '8-32', description: '', serverType: 'minecraft-paper' },
  { id: 'mc-purpur-2gb', name: '2 GB', ram: '2 GB', cpu: '1 vCPU', disk: '10 GB NVMe', price: 7.99, players: '2-8', description: '', serverType: 'minecraft-purpur' },
  { id: 'mc-purpur-4gb', name: '4 GB', ram: '4 GB', cpu: '1 vCPU', disk: '20 GB NVMe', price: 14.99, players: '4-16', description: '', serverType: 'minecraft-purpur' },
  { id: 'mc-purpur-8gb', name: '8 GB', ram: '8 GB', cpu: '2 vCPU', disk: '30 GB NVMe', price: 28.99, players: '8-32', description: '', recommended: true, serverType: 'minecraft-purpur' },
  { id: 'mc-purpur-12gb', name: '12 GB', ram: '12 GB', cpu: '2 vCPU', disk: '50 GB NVMe', price: 37.99, players: '8-32', description: '', serverType: 'minecraft-purpur' },
  { id: 'mc-fabric-4gb', name: '4 GB', ram: '4 GB', cpu: '1 vCPU', disk: '20 GB NVMe', price: 16.99, players: '4-16', description: '', serverType: 'minecraft-fabric' },
  { id: 'mc-fabric-8gb', name: '8 GB', ram: '8 GB', cpu: '2 vCPU', disk: '30 GB NVMe', price: 30.99, players: '8-32', description: '', recommended: true, serverType: 'minecraft-fabric' },
  { id: 'mc-fabric-12gb', name: '12 GB', ram: '12 GB', cpu: '2 vCPU', disk: '50 GB NVMe', price: 39.99, players: '8-32', description: '', serverType: 'minecraft-fabric' },
  { id: 'mc-forge-4gb', name: '4 GB', ram: '4 GB', cpu: '1 vCPU', disk: '20 GB NVMe', price: 18.99, players: '4-16', description: '', serverType: 'minecraft-forge' },
  { id: 'mc-forge-8gb', name: '8 GB', ram: '8 GB', cpu: '2 vCPU', disk: '30 GB NVMe', price: 32.99, players: '8-32', description: '', recommended: true, serverType: 'minecraft-forge' },
  { id: 'mc-forge-12gb', name: '12 GB', ram: '12 GB', cpu: '2 vCPU', disk: '50 GB NVMe', price: 41.99, players: '8-32', description: '', serverType: 'minecraft-forge' },
];

const fallbackGameTypes = [
  { id: 'minecraft-paper', name: 'Minecraft Paper', description: 'From $6.99/mo' },
  { id: 'minecraft-purpur', name: 'Minecraft Purpur', description: 'From $7.99/mo' },
  { id: 'minecraft-fabric', name: 'Minecraft Fabric', description: 'From $16.99/mo' },
  { id: 'minecraft-forge', name: 'Minecraft Forge', description: 'From $18.99/mo' },
];

const MinecraftConfig = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serverName, setServerName] = useState('');
  const [region] = useState('us-east');
  const [planId, setPlanId] = useState('mc-paper-8gb');
  const [gameType, setGameType] = useState('minecraft-paper');
  const [billingTerm, setBillingTerm] = useState('semiannual');
  const { plans, gameTypes, getPriceForTerm } = useGamePlanCatalog('minecraft', fallbackPlans, fallbackGameTypes);
  const effectiveGameTypes = React.useMemo(
    () => gameTypes.filter((g) => g.id !== 'minecraft' && !isRetailVanillaGameTypeId(g.id)),
    [gameTypes]
  );

  const { run: createCheckout, loading } = useAction(async () => {
    if (!serverName.trim()) throw new Error('Server name is required');

    const response = await stripeService.createCheckoutSession({
      item_type: 'game',
      plan_id: planId,
      region,
      server_name: serverName.trim(),
      modpack_id: gameType,
      term: billingTerm as 'monthly' | 'quarterly' | 'yearly',
      success_url: `${window.location.origin}/purchase-success`,
      cancel_url: `${window.location.origin}/configure/minecraft`
    });

    window.location.href = response.checkout_url;
  });

  React.useEffect(() => {
    if (plans.length > 0 && !plans.some((p) => p.id === planId)) {
      setPlanId(plans[0].id);
    }
  }, [plans, planId]);

  React.useEffect(() => {
    if (effectiveGameTypes.length > 0 && !effectiveGameTypes.some((g) => g.id === gameType)) {
      setGameType(effectiveGameTypes[0].id);
    }
  }, [effectiveGameTypes, gameType]);

  const billingTerms = [
    { id: 'monthly', name: 'Monthly', discount: 0 },
    { id: 'quarterly', name: '3 Months', discount: 5 },
    { id: 'semiannual', name: '6 Months', discount: 10 },
    { id: 'yearly', name: '12 Months', discount: 20 }
  ];

  const visiblePlans = React.useMemo(() => {
    const byType = plans.filter((p) => p.serverType === gameType);
    return byType.length > 0 ? byType : plans;
  }, [plans, gameType]);

  React.useEffect(() => {
    if (visiblePlans.length > 0 && !visiblePlans.some((p) => p.id === planId)) {
      setPlanId(visiblePlans[0].id);
    }
  }, [visiblePlans, planId]);

  const selectedPlan = visiblePlans.find(p => p.id === planId) || visiblePlans[0];
  const selectedTerm = billingTerms.find(t => t.id === billingTerm);
  const monthlyBaseline = (selectedPlan?.price || 0) * (selectedTerm?.id === 'quarterly' ? 3 : selectedTerm?.id === 'semiannual' ? 6 : selectedTerm?.id === 'yearly' ? 12 : 1);
  const finalPrice = getPriceForTerm(selectedPlan, billingTerm);
  const savings = Math.max(0, monthlyBaseline - finalPrice);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 bg-no-repeat"
        style={{ 
          backgroundImage: `url(${minecraftWallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/30 to-gray-900/50"></div>
      </div>
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link to="/deploy" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors mb-4">
              ← Back to Servers
            </Link>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-gray-100">Configure Your</span>{' '}
            <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
              Minecraft Server
            </span>
          </h1>
          
          <p className="text-lg text-gray-100 max-w-3xl mb-8">
            Customize your server settings to match your gaming needs
          </p>

          {/* Current Selection Banner */}
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg mb-8 inline-block">
            High-performance, moddable server, 100+ players
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Server Configuration */}
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-emerald-500 rounded mr-3 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Server Configuration</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">Server Name</label>
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      placeholder="Enter your server name"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Server Location</label>
                    <div className="px-4 py-3 rounded-lg bg-gray-700 text-gray-300">
                      US East
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Type Selection */}
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Game Type</h2>
                
                <div className="space-y-3">
                  {effectiveGameTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setGameType(type.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        gameType === type.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-white">{type.name}</h3>
                          <p className="text-gray-100 text-base">{type.description}</p>
                        </div>
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center">
                          {gameType === type.id && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Choose Your Plan */}
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Choose Your Plan</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {visiblePlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setPlanId(plan.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        planId === plan.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                          {plan.recommended && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Recommended</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">${plan.price}</div>
                          <div className="text-gray-200 text-base">per month</div>
                        </div>
                      </div>
                      {plan.description?.trim() ? (
                        <p className="text-gray-100 text-base mb-2">{plan.description}</p>
                      ) : null}
                      <div className="text-emerald-400 text-sm font-semibold">
                        {plan.ram} RAM • {plan.cpu} • {plan.disk}
                      </div>
                      {planIncludesAutoBackups(plan) && (
                        <div className="mt-2 text-sm text-gray-200">Auto backups included</div>
                      )}
                    </div>
                  ))}
                </div>
                
              </div>

              {/* Billing Period */}
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Billing Period</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {billingTerms.map((term) => (
                    <button
                      key={term.id}
                      onClick={() => setBillingTerm(term.id)}
                      className={`px-4 py-3 rounded-lg transition-colors text-center ${
                        billingTerm === term.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-semibold">{term.name}</div>
                      {term.id === 'semiannual' ? (
                        <div className="text-xs text-amber-300 font-medium">Best value · Save {term.discount}%</div>
                      ) : term.discount > 0 ? (
                        <div className="text-xs text-emerald-300">Save {term.discount}%</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6 sticky top-8">
                <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-100">Server Plan ({planCardTitle(selectedPlan)})</span>
                    <span className="text-white">${selectedPlan?.price}/mo</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-100">Game Type</span>
                    <span className="text-white">{effectiveGameTypes.find(t => t.id === gameType)?.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-100">Billing</span>
                    <span className="text-white">{selectedTerm?.name}</span>
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-emerald-400">${finalPrice.toFixed(2)}</span>
                  </div>
                  {selectedTerm?.id !== 'monthly' && savings > 0 && (
                    <div className="text-sm text-emerald-300 text-right mt-1">
                      Save ${savings.toFixed(2)} ({selectedTerm?.discount}% off)
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">Included Features</h4>
                  <div className="space-y-2">
                    {[
                      '99.9% uptime SLA',
                      'Anti-DDoS Game protection',
                      'Instant setup & NVMe',
                      'Ryzen 9 5900X',
                      '24/7 support and Discord community access',
                      ...(selectedPlan && planIncludesAutoBackups(selectedPlan) ? ['Daily auto backups'] : []),
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-4 h-4 bg-emerald-500 rounded-full mr-3 flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-white text-base">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/auth', { state: { returnTo: location.pathname + location.search } });
                      return;
                    }
                    createCheckout();
                  }}
                  disabled={loading || !serverName.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Server...' : (user ? 'Deploy Your Server' : 'Sign Up to Deploy Server')}
                </button>
              </div>
            </div>
          </div>
          <GameTransparencySection gameSlug="minecraft" accentColor="emerald" />
        </div>
      </div>
    </div>
  );
};

export default MinecraftConfig;
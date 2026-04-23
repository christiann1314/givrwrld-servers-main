import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Server, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';

/**
 * Minecraft wedge landing (not currently routed). Plan/pricing from api.getPlans(); CTA to /configure/minecraft.
 * To re-enable: add Route path="/deploy/minecraft" and point Deploy Minecraft card to /deploy/minecraft.
 */

/** Plan from API only; no hardcoded plan_id. */
type PlanFromApi = {
  id: string;
  game?: string;
  ram_gb?: number;
  price_monthly?: number;
  display_name?: string;
  vcores?: number;
  ssd_gb?: number;
};

const DeployMinecraft = () => {
  const [plans, setPlans] = useState<PlanFromApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.getPlans();
        if (!mounted || !response?.success) return;
        const all = (response?.plans || []).filter(
          (p: any) =>
            String(p?.game || '').toLowerCase() === 'minecraft' &&
            p?.item_type === 'game' &&
            Number(p?.is_active) === 1
        );
        const sorted = [...all].sort(
          (a: any, b: any) => Number(a?.price_monthly ?? 0) - Number(b?.price_monthly ?? 0)
        );
        if (mounted) setPlans(sorted);
      } catch (e) {
        console.error('Failed to load Minecraft plans', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const recommendedPlan = plans.length > 0 ? plans[0] : null;
  const price = recommendedPlan ? Number(recommendedPlan.price_monthly ?? 0) : null;

  const rootClass =
    'min-h-screen bg-gray-900 text-white relative overflow-hidden';
  return (
    <div className={rootClass}>
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://minecraft.wiki/images/thumb/MC_key_art_2024_no_logo.jpg/1280px-MC_key_art_2024_no_logo.jpg")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-transparent to-emerald-900/10" />
      </div>

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-8">
            <Link
              to="/deploy"
              className="inline-flex items-center text-emerald-400 hover:text-emerald-300 text-sm"
            >
              ← All games
            </Link>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
              Minecraft on GIVRwrld
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl">
            Run Java or Bedrock with Paper, Fabric, Forge, Purpur, and more. Plugin and mod support, NVMe storage, and typical setup in minutes.
          </p>

          {/* Why Minecraft on GIVRwrld */}
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <Zap className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Fast provisioning</h3>
              <p className="text-gray-400 text-sm">Server ready in minutes. No manual tickets.</p>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <Server className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Plugin & mod friendly</h3>
              <p className="text-gray-400 text-sm">Paper, Spigot, Fabric, and more. Your stack, your rules.</p>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6">
              <Shield className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">DDoS mitigation included</h3>
              <p className="text-gray-400 text-sm">All game servers are protected.</p>
            </div>
          </div>

          {/* Recommended plan from API only */}
          <div className="bg-gray-800/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Get started</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading plans…
              </div>
            ) : recommendedPlan ? (
              <>
                <p className="text-gray-300 mb-4">
                  Recommended plan: <strong className="text-white">{recommendedPlan.display_name || `${recommendedPlan.ram_gb}GB`}</strong>
                  {recommendedPlan.ram_gb != null && (
                    <span className="text-gray-400 ml-2">— {recommendedPlan.ram_gb}GB RAM, {recommendedPlan.vcores} vCPU, {recommendedPlan.ssd_gb}GB NVMe</span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-3xl font-bold text-emerald-400">
                    ${Number(price).toFixed(2)}
                    <span className="text-lg font-normal text-gray-400 ml-1">/month</span>
                  </span>
                  <Link
                    to="/configure/minecraft"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Deploy Minecraft server
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Choose your exact plan and billing term on the next page. All plan IDs come from our catalog.
                </p>
              </>
            ) : (
              <p className="text-gray-400 mb-4">No Minecraft plans available right now. Check back soon or view all games.</p>
              <Link
                to="/deploy"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
              >
                View all games
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          <p className="text-sm text-gray-500">
            DDoS mitigation is included for all game servers. Not happy in the first 48 hours? Contact support for a full refund.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeployMinecraft;

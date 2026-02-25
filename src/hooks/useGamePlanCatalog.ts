import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface CatalogPlanOption {
  id: string;
  name: string;
  ram: string;
  ram_gb?: number;
  cpu: string;
  disk: string;
  price: number;
  players: string;
  description: string;
  recommended?: boolean;
  pteroEggId?: number | null;
  pteroEggName?: string | null;
  pricing?: {
    monthly: number;
    quarterly: number;
    semiannual: number;
    yearly: number;
  };
}

export interface CatalogGameTypeOption {
  id: string;
  name: string;
  description: string;
  pteroEggId?: number | null;
}

function normalizeGameSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useGamePlanCatalog(
  game: string,
  fallbackPlans: CatalogPlanOption[],
  fallbackGameTypes: CatalogGameTypeOption[]
) {
  const [plans, setPlans] = useState<CatalogPlanOption[]>(fallbackPlans);
  const [gameTypes, setGameTypes] = useState<CatalogGameTypeOption[]>(fallbackGameTypes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.getPlans();
        if (!mounted || !response?.success) return;

        const targetGame = normalizeGameSlug(game);
        const rows = (response?.plans || []).filter((p: any) => normalizeGameSlug(p.game) === targetGame && p.item_type === 'game' && Number(p.is_active) === 1);
        if (rows.length === 0) return;

        const mappedPlans: CatalogPlanOption[] = rows.map((p: any) => {
          const ramGb = Number(p.ram_gb || 0);
          return {
            id: p.id,
            name: `${ramGb}GB`,
            ram: `${ramGb}GB`,
            ram_gb: ramGb,
            cpu: `${p.vcores} vCPU`,
            disk: `${p.ssd_gb}GB NVMe`,
            price: Number(p.price_monthly || 0),
            players: '2-32',
            description: p.display_name || `${ramGb}GB ${game} plan`,
            recommended: ramGb === 8,
            pteroEggId: p.ptero_egg_id ? Number(p.ptero_egg_id) : null,
            pteroEggName: p.ptero_egg_name || null,
            pricing: {
              monthly: Number(p.price_monthly || 0),
              quarterly: Number(p.price_quarterly || p.price_monthly || 0),
              semiannual: Number(p.price_semiannual || p.price_monthly || 0),
              yearly: Number(p.price_yearly || p.price_monthly || 0),
            },
          };
        });

        const eggMap = new Map<string, CatalogGameTypeOption>();
        for (const p of mappedPlans) {
          const key = p.pteroEggId ? `egg-${p.pteroEggId}` : `plan-${p.id}`;
          if (!eggMap.has(key)) {
            const eggName = p.pteroEggName || `${game} default`;
            eggMap.set(key, {
              id: key,
              name: eggName,
              description: `Runs on ${eggName}`,
              pteroEggId: p.pteroEggId || null,
            });
          }
        }

        setPlans(mappedPlans);
        if (eggMap.size > 0) {
          setGameTypes(Array.from(eggMap.values()));
        }
      } catch (error) {
        console.warn(`Failed to load live plans for ${game}; using fallback values.`, error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [game]);

  const getPriceForTerm = useMemo(() => {
    return (plan: CatalogPlanOption | undefined, term: string) => {
      if (!plan) return 0;
      const prices = plan.pricing || {
        monthly: plan.price,
        quarterly: plan.price * 3,
        semiannual: plan.price * 6,
        yearly: plan.price * 12,
      };
      switch (String(term || 'monthly').toLowerCase()) {
        case 'quarterly':
          return prices.quarterly;
        case 'semiannual':
          return prices.semiannual;
        case 'yearly':
          return prices.yearly;
        default:
          return prices.monthly;
      }
    };
  }, []);

  return {
    plans,
    gameTypes,
    loading,
    getPriceForTerm,
  };
}


import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface CatalogPlanOption {
  id: string;
  /** Short tier label (e.g. "8 GB") for summaries and fallbacks. */
  name: string;
  /** Primary label from billing DB when present (e.g. "ARK Primal Fear Ready 8GB"). */
  displayName?: string;
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

/** RAM tier in GB from structured field or parsed from strings like "8GB". */
export function planRamGb(plan: Pick<CatalogPlanOption, 'ram_gb' | 'ram'>): number {
  const n = Number(plan.ram_gb);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  const m = String(plan.ram || '').match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(Number(m[1])) : 0;
}

/** Product rule: auto backups messaging for plans at 8GB RAM and above. */
export function planIncludesAutoBackups(plan: CatalogPlanOption | undefined): boolean {
  if (!plan) return false;
  return planRamGb(plan) >= 8;
}

export function planCardTitle(plan: CatalogPlanOption | undefined): string {
  if (!plan) return '';
  const d = plan.displayName?.trim();
  return d || plan.name;
}

function normalizeGameSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Pick one "recommended" plan per egg / server-type group so the UI does not mark every 8GB row.
 * Preference order follows typical sweet-spot tiers for game hosting.
 */
function pickRecommendedPlanIdInGroup(group: CatalogPlanOption[]): string | null {
  if (group.length === 0) return null;
  const sorted = [...group].sort((a, b) => {
    const ra = planRamGb(a) - planRamGb(b);
    if (ra !== 0) return ra;
    if (a.price !== b.price) return a.price - b.price;
    return a.id.localeCompare(b.id);
  });
  const tiers = [8, 6, 4, 12, 16, 2, 3, 1];
  for (const tier of tiers) {
    const hit = sorted.find((p) => planRamGb(p) === tier);
    if (hit) return hit.id;
  }
  return sorted[Math.floor(sorted.length / 2)]?.id ?? sorted[0].id;
}

function assignSingleRecommendedPerEgg(plans: CatalogPlanOption[]): CatalogPlanOption[] {
  const byEgg = new Map<string, CatalogPlanOption[]>();
  for (const p of plans) {
    const k = p.pteroEggId != null && Number.isFinite(Number(p.pteroEggId)) ? `egg:${p.pteroEggId}` : 'egg:none';
    if (!byEgg.has(k)) byEgg.set(k, []);
    byEgg.get(k)!.push(p);
  }
  const chosen = new Set<string>();
  for (const g of byEgg.values()) {
    const id = pickRecommendedPlanIdInGroup(g);
    if (id) chosen.add(id);
  }
  return plans.map((p) => ({ ...p, recommended: chosen.has(p.id) }));
}

export function useGamePlanCatalog(
  game: string,
  fallbackPlans: CatalogPlanOption[],
  fallbackGameTypes: CatalogGameTypeOption[]
) {
  const [plans, setPlans] = useState<CatalogPlanOption[]>(() => assignSingleRecommendedPerEgg(fallbackPlans));
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
        const rows = (response?.plans || []).filter(
          (p: any) =>
            normalizeGameSlug(p.game) === targetGame && p.item_type === 'game' && Number(p.is_active) === 1
        );
        if (rows.length === 0) return;

        const sortedRows = [...rows].sort((a: any, b: any) => {
          const ra = Number(a.ram_gb || 0) - Number(b.ram_gb || 0);
          if (ra !== 0) return ra;
          const pa = Number(a.price_monthly || 0) - Number(b.price_monthly || 0);
          if (pa !== 0) return pa;
          return String(a.id).localeCompare(String(b.id));
        });

        const mappedPlans: CatalogPlanOption[] = sortedRows.map((p: any) => {
          const ramGb = Number(p.ram_gb || 0);
          const vcores = Number(p.vcores || 0);
          const ssdGb = Number(p.ssd_gb || 0);
          const display = String(p.display_name || '').trim();
          const specLine = `${ramGb} GB RAM · ${vcores} vCPU · ${ssdGb} GB NVMe`;
          return {
            id: p.id,
            name: `${ramGb} GB`,
            displayName: display || `${ramGb} GB`,
            ram: `${ramGb} GB`,
            ram_gb: ramGb,
            cpu: `${vcores} vCPU`,
            disk: `${ssdGb} GB NVMe`,
            price: Number(p.price_monthly || 0),
            players: '2–32',
            description: display ? specLine : `${specLine} — pick the tier that fits your player count.`,
            recommended: false,
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

        setPlans(assignSingleRecommendedPerEgg(mappedPlans));
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

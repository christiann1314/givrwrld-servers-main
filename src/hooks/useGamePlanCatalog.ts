import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface CatalogPlanOption {
  id: string;
  /** Short tier label (e.g. "8 GB") for summaries and fallbacks. */
  name: string;
  /** Primary label from billing DB when present (e.g. "ARK Primal Fear Ready 8GB"). */
  displayName?: string;
  /** Variant slug (e.g. "factorio-vanilla") used to link plans to their game-type group. */
  serverType?: string;
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

/** Legacy storefront SKUs we no longer sell (Minecraft Mojang jar + per-game *-vanilla-* plans). */
export function isRetailVanillaPlanId(planId: string): boolean {
  const id = String(planId || '');
  if (!id) return false;
  if (id.startsWith('mc-vanilla-')) return true;
  return id.includes('-vanilla-');
}

/** Game-type / modpack grouping id for a hidden vanilla stack (API or fallback). */
export function isRetailVanillaGameTypeId(gameTypeId: string): boolean {
  const id = String(gameTypeId || '');
  if (!id) return false;
  if (id === 'minecraft-vanilla') return true;
  return /(^|-)vanilla$/.test(id);
}

function normalizeGameSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Strip trailing RAM suffix (e.g. " 4GB", " 12GB") to get the variant name. */
function extractVariantName(displayName: string): string {
  return displayName.replace(/\s+\d+(?:\.\d+)?\s*GB$/i, '').trim() || displayName;
}

/**
 * Pick one "recommended" plan per variant group so the UI shows one badge per server-type.
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

function assignSingleRecommendedPerVariant(plans: CatalogPlanOption[]): CatalogPlanOption[] {
  const byVariant = new Map<string, CatalogPlanOption[]>();
  for (const p of plans) {
    const k = p.serverType || 'default';
    if (!byVariant.has(k)) byVariant.set(k, []);
    byVariant.get(k)!.push(p);
  }
  const chosen = new Set<string>();
  for (const g of byVariant.values()) {
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
  const [plans, setPlans] = useState<CatalogPlanOption[]>(() =>
    assignSingleRecommendedPerVariant(fallbackPlans.filter((p) => !isRetailVanillaPlanId(p.id)))
  );
  const [gameTypes, setGameTypes] = useState<CatalogGameTypeOption[]>(() =>
    fallbackGameTypes.filter((g) => !isRetailVanillaGameTypeId(g.id))
  );
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

        const mappedPlans: CatalogPlanOption[] = sortedRows
          .map((p: any) => {
            const ramGb = Number(p.ram_gb || 0);
            const vcores = Number(p.vcores || 0);
            const ssdGb = Number(p.ssd_gb || 0);
            const display = String(p.display_name || '').trim();
            const variantName = display ? extractVariantName(display) : game;
            const variantId = normalizeGameSlug(variantName);
            return {
              id: p.id,
              name: `${ramGb} GB`,
              displayName: display || `${ramGb} GB`,
              serverType: variantId,
              ram: `${ramGb} GB`,
              ram_gb: ramGb,
              cpu: `${vcores} vCPU`,
              disk: `${ssdGb} GB NVMe`,
              price: Number(p.price_monthly || 0),
              players: '2–32',
              description: '',
              recommended: false,
              pteroEggId: p.ptero_egg_id ? Number(p.ptero_egg_id) : null,
              pteroEggName: p.ptero_egg_name || null,
              pricing: {
                monthly: Number(p.price_monthly || 0),
                quarterly: Number(p.price_quarterly) || Number((Number(p.price_monthly || 0) * 3 * 0.95).toFixed(2)),
                semiannual: Number(p.price_semiannual) || Number((Number(p.price_monthly || 0) * 6 * 0.90).toFixed(2)),
                yearly: Number(p.price_yearly) || Number((Number(p.price_monthly || 0) * 12 * 0.80).toFixed(2)),
              },
            };
          })
          .filter((p) => !isRetailVanillaPlanId(p.id));

        if (mappedPlans.length === 0) {
          return;
        }

        const variantMap = new Map<string, { name: string; pteroEggId: number | null; minPrice: number; count: number }>();
        for (const p of mappedPlans) {
          const key = p.serverType || normalizeGameSlug(game);
          const existing = variantMap.get(key);
          if (!existing) {
            const variantName = p.displayName ? extractVariantName(p.displayName) : game;
            variantMap.set(key, { name: variantName, pteroEggId: p.pteroEggId, minPrice: p.price, count: 1 });
          } else {
            existing.minPrice = Math.min(existing.minPrice, p.price);
            existing.count += 1;
          }
        }

        const derivedGameTypes: CatalogGameTypeOption[] = [];
        for (const [key, v] of variantMap) {
          derivedGameTypes.push({
            id: key,
            name: v.name,
            description: `From $${v.minPrice.toFixed(2)}/mo`,
            pteroEggId: v.pteroEggId,
          });
        }

        setPlans(assignSingleRecommendedPerVariant(mappedPlans));
        if (derivedGameTypes.length > 0) {
          setGameTypes(derivedGameTypes);
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
        quarterly: Number((plan.price * 3 * 0.95).toFixed(2)),
        semiannual: Number((plan.price * 6 * 0.90).toFixed(2)),
        yearly: Number((plan.price * 12 * 0.80).toFixed(2)),
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

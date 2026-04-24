/**
 * Canonical `plans.game` slug for storefront cards (must match `GAME_DISPLAY` keys
 * and `/configure/...` routes). Mirrors `api/lib/normalizeGameKey.js` so DB
 * variants like spaces/underscores or marketing slugs still resolve.
 */
export function normalizePlanGameKey(value: unknown): string {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
  const aliases: Record<string, string> = {
    amongus: 'among-us',
    among_us: 'among-us',
    among: 'among-us',
    vintagestory: 'vintage-story',
    csgo: 'counter-strike',
    counter_strike: 'counter-strike',
    'counter-strike-global-offensive': 'counter-strike',
    'counter-strike-go': 'counter-strike',
    'ark-survival-ascended': 'ark-asa',
    'ark-ascended': 'ark-asa',
    'ark-survival-evolved': 'ark',
    'ark-evolved': 'ark',
    'ark-se': 'ark',
    'ark-survival': 'ark',
  };
  return aliases[slug] || slug;
}

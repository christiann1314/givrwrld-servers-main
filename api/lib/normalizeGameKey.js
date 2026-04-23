/**
 * Canonical storefront / plan game slug (matches orders.game via plans.game).
 * @param {unknown} value
 */
export function normalizeGameKey(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
  const aliases = {
    amongus: 'among-us',
    'among-us': 'among-us',
    among: 'among-us',
    vintagestory: 'vintage-story',
    csgo: 'counter-strike',
    'counter-strike-global-offensive': 'counter-strike',
    'counter-strike-go': 'counter-strike',
    'ark-survival-ascended': 'ark-asa',
    'ark-ascended': 'ark-asa',
  };
  return aliases[slug] || slug;
}

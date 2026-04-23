// Mod profile configuration for game variants (MOD_PROFILE env at provision time).
// variantKey = plan id with game prefix stripped (e.g. terraria-tmodloader-6gb → tmodloader-6gb).

/**
 * @param {string} variantSlug e.g. tmodloader, vanilla
 * @param {string} profileId stable MOD_PROFILE value
 * @param {string} label
 * @param {number[]} ramGbTiers
 */
function tiers(variantSlug, profileId, label, ramGbTiers) {
  /** @type {Record<string, { profileId: string; label: string; env: Record<string, string> }>} */
  const out = {};
  for (const ram of ramGbTiers) {
    out[`${variantSlug}-${ram}gb`] = {
      profileId,
      label,
      env: { MOD_PROFILE: profileId },
    };
  }
  return out;
}

const modProfiles = {
  terraria: {
    ...tiers('vanilla', 'terraria-vanilla', 'Terraria Vanilla', [2, 4, 6, 8, 12]),
    ...tiers('tmodloader', 'terraria-tmodloader', 'Terraria tModLoader', [4, 6, 8, 12]),
  },
};

function normalizePlanId(planId) {
  return String(planId || '').toLowerCase().trim();
}

/**
 * Derive a variant key from a plan id by stripping the game prefix.
 * e.g. planId "terraria-tmodloader-4gb" with gameKey "terraria"
 * → "tmodloader-4gb".
 */
function getVariantKeyFromPlanId(planId, gameKey) {
  const slug = normalizePlanId(planId);
  if (gameKey) {
    const prefix = gameKey.toLowerCase().trim() + '-';
    if (slug.startsWith(prefix)) {
      return slug.slice(prefix.length);
    }
    const mcPrefix = 'mc-';
    if (gameKey === 'minecraft' && slug.startsWith(mcPrefix)) {
      return slug.slice(mcPrefix.length);
    }
  }
  const parts = slug.split('-').filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(1).join('-');
}

export function getModProfileForOrder(order, gameKey) {
  if (!order || !order.plan_id) return null;
  const normalizedGame = String(gameKey || '').toLowerCase().trim();
  const gameProfiles = modProfiles[normalizedGame];
  if (!gameProfiles) return null;

  const variantKey = getVariantKeyFromPlanId(order.plan_id, normalizedGame);
  if (!variantKey) return null;

  const profile = gameProfiles[variantKey];
  if (!profile) return null;

  return profile;
}

export default modProfiles;

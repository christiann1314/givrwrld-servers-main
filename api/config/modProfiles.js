// Mod profile configuration for game variants.
// variantKey = plan id with game prefix stripped (e.g. rust-oxide-6gb → oxide-6gb).

/**
 * @param {string} variantSlug e.g. oxide, tmodloader, primal-fear-ready
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
  rust: {
    ...tiers('oxide', 'rust-oxide', 'Rust Oxide (uMod)', [2, 4, 6, 8, 12]),
    ...tiers('carbon', 'rust-carbon', 'Rust Carbon', [2, 4, 6, 8, 12]),
  },

  terraria: {
    ...tiers('tmodloader', 'terraria-tmodloader', 'Terraria tModLoader', [4, 6, 8, 12]),
    ...tiers('calamity-ready', 'terraria-calamity', 'Terraria Calamity Ready', [4, 6, 8, 12]),
  },

  palworld: {
    ...tiers('community-plus', 'palworld-community-plus', 'Palworld Community Plus', [4, 6, 8, 12]),
    ...tiers('hardcore', 'palworld-hardcore', 'Palworld Hardcore', [4, 6, 8, 12]),
  },

  enshrouded: {
    ...tiers('modded', 'enshrouded-modded', 'Enshrouded Modded', [6, 8, 12]),
  },

  ark: {
    ...tiers('primal-fear-ready', 'ark-primal-fear', 'ARK Primal Fear Ready', [6, 8, 12]),
    ...tiers('pve-cluster-ready', 'ark-pve-cluster', 'ARK PvE Cluster Ready', [6, 8, 12]),
  },

  factorio: {
    ...tiers('space-age-ready', 'factorio-space-age', 'Factorio Space Age Ready', [4, 6, 8, 12]),
    ...tiers('bobs-angels-ready', 'factorio-bobs-angels', "Factorio Bob's+Angel's Ready", [4, 6, 8, 12]),
  },

  mindustry: {
    ...tiers('pvp', 'mindustry-pvp', 'Mindustry PvP', [4, 6, 8, 12]),
    ...tiers('survival', 'mindustry-survival', 'Mindustry Survival', [4, 6, 8, 12]),
  },

  rimworld: {
    ...tiers('multiplayer-ready', 'rimworld-multiplayer-ready', 'Rimworld Multiplayer Ready', [4, 6, 8, 12]),
  },

  teeworlds: {
    ...tiers('instagib', 'teeworlds-instagib', 'Teeworlds Instagib', [2, 4, 6, 8, 12]),
  },

  'among-us': {
    ...tiers('proximity-chat-ready', 'among-us-proximity-chat', 'Among Us Proximity Chat Ready', [4, 6, 8, 12]),
  },

  veloren: {
    ...tiers('rp-realm', 'veloren-rp-realm', 'Veloren RP Realm', [4, 6, 8, 12]),
  },

  'vintage-story': {
    ...tiers('primitive-plus', 'vintage-story-primitive-plus', 'Vintage Story Primitive Plus', [4, 6, 8, 12]),
  },
};

function normalizePlanId(planId) {
  return String(planId || '').toLowerCase().trim();
}

/**
 * Derive a variant key from a plan id by stripping the game prefix.
 * e.g. planId "among-us-proximity-chat-ready-4gb" with gameKey "among-us"
 * → "proximity-chat-ready-4gb".
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

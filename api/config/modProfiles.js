// Mod profile configuration for game variants.
// This is a lightweight, data‑only layer that lets us distinguish
// modded offerings without needing a unique Pterodactyl egg per variant.
//
// Key shape:
//   modProfiles[gameKey][variantKey] = {
//     profileId: string;   // stable identifier used by backend tooling
//     label: string;       // human‑readable label
//     env?: Record<string, string>; // optional extra env vars to inject
//   }
//
// gameKey is the normalized game slug (see normalizeGameKey in servers.js),
// e.g. 'rust', 'terraria', 'palworld', 'enshrouded'.
//
// variantKey is derived from the plan id, usually the part after the
// leading game prefix, e.g. for plan id 'rust-oxide-4gb' the variantKey
// is 'oxide-4gb'.

const modProfiles = {
  rust: {
    'oxide-2gb': { profileId: 'rust-oxide', label: 'Rust Oxide (uMod)', env: { MOD_PROFILE: 'rust-oxide' } },
    'oxide-4gb': { profileId: 'rust-oxide', label: 'Rust Oxide (uMod)', env: { MOD_PROFILE: 'rust-oxide' } },
    'oxide-8gb': { profileId: 'rust-oxide', label: 'Rust Oxide (uMod)', env: { MOD_PROFILE: 'rust-oxide' } },
    'carbon-4gb': { profileId: 'rust-carbon', label: 'Rust Carbon', env: { MOD_PROFILE: 'rust-carbon' } },
    'carbon-8gb': { profileId: 'rust-carbon', label: 'Rust Carbon', env: { MOD_PROFILE: 'rust-carbon' } },
  },

  terraria: {
    'tmodloader-4gb': { profileId: 'terraria-tmodloader', label: 'Terraria tModLoader', env: { MOD_PROFILE: 'terraria-tmodloader' } },
    'calamity-ready-4gb': { profileId: 'terraria-calamity', label: 'Terraria Calamity Ready', env: { MOD_PROFILE: 'terraria-calamity' } },
  },

  palworld: {
    'community-plus-8gb': { profileId: 'palworld-community-plus', label: 'Palworld Community Plus', env: { MOD_PROFILE: 'palworld-community-plus' } },
    'hardcore-8gb': { profileId: 'palworld-hardcore', label: 'Palworld Hardcore', env: { MOD_PROFILE: 'palworld-hardcore' } },
  },

  enshrouded: {
    'modded-6gb': { profileId: 'enshrouded-modded', label: 'Enshrouded Modded', env: { MOD_PROFILE: 'enshrouded-modded' } },
    'modded-8gb': { profileId: 'enshrouded-modded', label: 'Enshrouded Modded', env: { MOD_PROFILE: 'enshrouded-modded' } },
  },

  ark: {
    'primal-fear-ready-8gb': { profileId: 'ark-primal-fear', label: 'ARK Primal Fear Ready', env: { MOD_PROFILE: 'ark-primal-fear' } },
    'pve-cluster-ready-8gb': { profileId: 'ark-pve-cluster', label: 'ARK PvE Cluster Ready', env: { MOD_PROFILE: 'ark-pve-cluster' } },
  },

  factorio: {
    'space-age-ready-4gb': { profileId: 'factorio-space-age', label: 'Factorio Space Age Ready', env: { MOD_PROFILE: 'factorio-space-age' } },
    'bobs-angels-ready-4gb': { profileId: 'factorio-bobs-angels', label: "Factorio Bob's+Angel's Ready", env: { MOD_PROFILE: 'factorio-bobs-angels' } },
  },

  mindustry: {
    'pvp-4gb': { profileId: 'mindustry-pvp', label: 'Mindustry PvP', env: { MOD_PROFILE: 'mindustry-pvp' } },
    'survival-4gb': { profileId: 'mindustry-survival', label: 'Mindustry Survival', env: { MOD_PROFILE: 'mindustry-survival' } },
  },

  teeworlds: {
    'instagib-2gb': { profileId: 'teeworlds-instagib', label: 'Teeworlds Instagib', env: { MOD_PROFILE: 'teeworlds-instagib' } },
  },

  'among-us': {
    'proximity-chat-ready-4gb': { profileId: 'among-us-proximity-chat', label: 'Among Us Proximity Chat Ready', env: { MOD_PROFILE: 'among-us-proximity-chat' } },
  },

  veloren: {
    'rp-realm-8gb': { profileId: 'veloren-rp-realm', label: 'Veloren RP Realm', env: { MOD_PROFILE: 'veloren-rp-realm' } },
  },

  'vintage-story': {
    'primitive-plus-8gb': { profileId: 'vintage-story-primitive-plus', label: 'Vintage Story Primitive Plus', env: { MOD_PROFILE: 'vintage-story-primitive-plus' } },
  },
};

function normalizePlanId(planId) {
  return String(planId || '').toLowerCase().trim();
}

/**
 * Derive a variant key from a plan id by stripping the game prefix.
 * e.g. planId "among-us-proximity-chat-ready-4gb" with gameKey "among-us"
 * → "proximity-chat-ready-4gb".
 * Falls back to stripping the first segment if no game key is provided.
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


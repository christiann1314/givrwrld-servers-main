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
    // Example: Rust Oxide (uMod) tiers like rust-oxide-4gb, rust-oxide-8gb, etc.
    'oxide-2gb': {
      profileId: 'rust-oxide',
      label: 'Rust Oxide (uMod)',
      env: {
        MOD_PROFILE: 'rust-oxide',
      },
    },
    'oxide-4gb': {
      profileId: 'rust-oxide',
      label: 'Rust Oxide (uMod)',
      env: {
        MOD_PROFILE: 'rust-oxide',
      },
    },
    'oxide-8gb': {
      profileId: 'rust-oxide',
      label: 'Rust Oxide (uMod)',
      env: {
        MOD_PROFILE: 'rust-oxide',
      },
    },
    // Example: Rust Carbon variants.
    'carbon-4gb': {
      profileId: 'rust-carbon',
      label: 'Rust Carbon',
      env: {
        MOD_PROFILE: 'rust-carbon',
      },
    },
    'carbon-8gb': {
      profileId: 'rust-carbon',
      label: 'Rust Carbon',
      env: {
        MOD_PROFILE: 'rust-carbon',
      },
    },
  },

  terraria: {
    'tmodloader-2gb': {
      profileId: 'terraria-tmodloader',
      label: 'Terraria tModLoader',
      env: {
        MOD_PROFILE: 'terraria-tmodloader',
      },
    },
    'calamity-4gb': {
      profileId: 'terraria-calamity',
      label: 'Terraria Calamity Ready',
      env: {
        MOD_PROFILE: 'terraria-calamity',
      },
    },
  },

  palworld: {
    'community-plus-8gb': {
      profileId: 'palworld-community-plus',
      label: 'Palworld Community Plus',
      env: {
        MOD_PROFILE: 'palworld-community-plus',
      },
    },
    'hardcore-8gb': {
      profileId: 'palworld-hardcore',
      label: 'Palworld Hardcore',
      env: {
        MOD_PROFILE: 'palworld-hardcore',
      },
    },
  },

  enshrouded: {
    'modded-8gb': {
      profileId: 'enshrouded-modded',
      label: 'Enshrouded Modded',
      env: {
        MOD_PROFILE: 'enshrouded-modded',
      },
    },
  },
};

function normalizePlanId(planId) {
  return String(planId || '').toLowerCase().trim();
}

// Derive a variant key from a plan id.
// For ids like "rust-oxide-4gb", "rust-oxide-8gb", "terraria-tmodloader-2gb",
// this returns everything after the first segment: "oxide-4gb", "tmodloader-2gb", etc.
function getVariantKeyFromPlanId(planId) {
  const slug = normalizePlanId(planId);
  const parts = slug.split('-').filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(1).join('-');
}

export function getModProfileForOrder(order, gameKey) {
  if (!order || !order.plan_id) return null;
  const normalizedGame = String(gameKey || '').toLowerCase().trim();
  const gameProfiles = modProfiles[normalizedGame];
  if (!gameProfiles) return null;

  const variantKey = getVariantKeyFromPlanId(order.plan_id);
  if (!variantKey) return null;

  const profile = gameProfiles[variantKey];
  if (!profile) return null;

  return profile;
}

export default modProfiles;


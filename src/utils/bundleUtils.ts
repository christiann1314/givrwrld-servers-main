export interface ServiceBundle {
  id: string;
  name: string;
  description: string;
  price: number;
  inclusions: string[];
  icon: string;
}

/** Bundled add-ons are no longer sold; keep "none" and legacy ids for dashboard display. */
export const serviceBundles: ServiceBundle[] = [
  {
    id: 'none',
    name: 'None',
    description: 'Basic server only',
    price: 0,
    inclusions: [],
    icon: '⚪',
  },
  {
    id: 'essentials',
    name: 'GIVRwrld Essentials (legacy)',
    description: 'Historical bundle — no longer offered at checkout',
    price: 6.99,
    inclusions: [],
    icon: '🔧',
  },
  {
    id: 'expansion',
    name: 'Game Expansion Pack (legacy)',
    description: 'Historical bundle — no longer offered at checkout',
    price: 14.99,
    inclusions: [],
    icon: '🎮',
  },
  {
    id: 'community',
    name: 'Community Pack (legacy)',
    description: 'Historical bundle — no longer offered at checkout',
    price: 4.99,
    inclusions: [],
    icon: '👥',
  },
];

export const getBundleName = (bundleId: string): string => {
  const bundle = serviceBundles.find((b) => b.id === bundleId);
  return bundle?.name || 'Unknown Bundle';
};

export const getBundleColor = (bundleId: string): string => {
  switch (bundleId) {
    case 'essentials':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'expansion':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'community':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export const getBundleEnvVars = (bundleId: string): Record<string, string> => {
  switch (bundleId) {
    case 'essentials':
      return {
        BACKUPS_ENABLED: '1',
        BACKUPS_RETENTION_DAYS: '7',
        DISCORD_BRIDGE: '1',
        ANALYTICS_ENABLED: '1',
      };
    case 'expansion':
      return {
        CROSS_DEPLOY_ENABLED: '1',
        PRESERVE_LIMITS_ON_GAME_SWITCH: '1',
      };
    case 'community':
      return {};
    default:
      return {};
  }
};

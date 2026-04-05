import { normalizeGameKey } from './normalizeGameKey.js';
import { PROXY_PUBLIC_DOMAIN } from '../config/gameRuntimePolicy.js';

/** Short DNS label per game for branded join hints (Class A/B). */
const PREFIX_BY_GAME = Object.freeze({
  minecraft: 'mc',
  rust: 'rust',
  palworld: 'pal',
  ark: 'ark',
  enshrouded: 'ensh',
  factorio: 'fac',
  mindustry: 'mind',
  'rimworld': 'rim',
  teeworlds: 'tw',
  terraria: 'terr',
  veloren: 'velo',
  'vintage-story': 'vs',
  'among-us': 'among',
});

/**
 * @param {{ gameKey: string, orderId: string, baseDomain?: string }} input
 */
export function buildGameBrandHostname({ gameKey, orderId, baseDomain = PROXY_PUBLIC_DOMAIN }) {
  const g = normalizeGameKey(gameKey);
  const prefix = PREFIX_BY_GAME[g] || 'srv';
  const short = String(orderId || '')
    .replace(/-/g, '')
    .slice(0, 8);
  return `${prefix}-${short}.${baseDomain}`;
}

/**
 * @param {'A' | 'B' | 'C'} trafficClass
 */
export function buildCustomerDisplayAddress({ trafficClass, hostname, port }) {
  if (trafficClass === 'C') {
    return `https://${hostname}`;
  }
  if (port != null && Number.isFinite(Number(port))) {
    return `${hostname}:${Number(port)}`;
  }
  return hostname;
}

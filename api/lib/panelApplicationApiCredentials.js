import { getDecryptedSecret } from '../utils/mysql.js';

/** True when value looks like a Pterodactyl Application API key (`ptla_…`). */
export function looksLikePterodactylApplicationApiKey(k) {
  const s = String(k || '').trim();
  if (!s.startsWith('ptla_')) return false;
  return s.length >= 32 && s.length <= 256;
}

/**
 * Panel Application API URL + key (trimmed).
 * When AES_KEY is set, DB secrets are consulted — but a stale `PANEL_URL` or `PANEL_APP_KEY` row
 * can pair badly with a rotated value in api/.env and yield HTTP 401 from Panel.
 * When `PANEL_APP_KEY` in the environment looks like a real `ptla_` token and `PANEL_URL` is set
 * there too, use both from the environment so URL and key stay paired.
 */
export async function resolvePanelApplicationApiCredentials() {
  const aesKey = process.env.AES_KEY;
  const fromSecretKey = aesKey ? await getDecryptedSecret('panel', 'PANEL_APP_KEY', aesKey) : null;
  const envKey = String(process.env.PANEL_APP_KEY || '').trim();
  const secretK = String(fromSecretKey || '').trim();
  const envUrl = String(process.env.PANEL_URL || '').trim();
  const secretUrl = String(
    (aesKey ? await getDecryptedSecret('panel', 'PANEL_URL', aesKey) : null) || '',
  ).trim();

  let panelAppKey = '';
  if (looksLikePterodactylApplicationApiKey(envKey)) {
    panelAppKey = envKey;
  } else if (looksLikePterodactylApplicationApiKey(secretK)) {
    panelAppKey = secretK;
  } else {
    panelAppKey = envKey || secretK;
  }

  let panelUrl = '';
  if (looksLikePterodactylApplicationApiKey(envKey) && envUrl) {
    panelUrl = envUrl;
  } else {
    panelUrl = secretUrl || envUrl;
  }

  return { panelUrl, panelAppKey };
}

/**
 * Environment validation at startup (envalid). Fail fast on missing required vars.
 */
import { cleanEnv, str, port, bool } from 'envalid';

export function validateEnv() {
  const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
    PORT: port({ default: 3001 }),
    MYSQL_HOST: str({ default: '127.0.0.1' }),
    MYSQL_PORT: port({ default: 3306 }),
    MYSQL_USER: str({ default: 'app_rw' }),
    MYSQL_PASSWORD: str({ default: '' }),
    MYSQL_DATABASE: str({ default: 'app_core' }),
    PAYPAL_CLIENT_ID: str({ default: '' }),
    PAYPAL_CLIENT_SECRET: str({ default: '' }),
    PAYPAL_SANDBOX: bool({ default: true }),
    PANEL_URL: str({ default: '' }),
    PANEL_APP_KEY: str({ default: '' }),
    JWT_SECRET: str({ default: '' }),
    FRONTEND_URL: str({ default: '' }),
  });

  // Additional sanity checks for Pterodactyl configuration:
  // - PANEL_URL and PANEL_APP_KEY must be both set or both empty.
  // - When set, PANEL_URL must be a valid http/https URL.
  const panelUrl = String(env.PANEL_URL || '').trim();
  const panelKey = String(env.PANEL_APP_KEY || '').trim();

  if (panelUrl || panelKey) {
    if (!panelUrl || !panelKey) {
      throw new Error('Pterodactyl configuration invalid: PANEL_URL and PANEL_APP_KEY must both be set or both be empty');
    }
    try {
      const url = new URL(panelUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`Unsupported PANEL_URL protocol: ${url.protocol}`);
      }
    } catch (err) {
      throw new Error(`Invalid PANEL_URL value: ${err?.message || String(err)}`);
    }
  }

  return env;
}

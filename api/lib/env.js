/**
 * Environment validation at startup (envalid). Fail fast on missing required vars.
 */
import { cleanEnv, str, port, bool } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, {
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
}

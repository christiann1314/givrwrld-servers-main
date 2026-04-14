// GIVRwrld API Server
// Self-hosted API for local/production deployments

import './config/loadEnv.js';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import pinoHttp from 'pino-http';
import cron from 'node-cron';
import paypalRoutes, { paypalWebhookRouter } from './routes/paypal.js';
import authRoutes from './routes/auth.js';
import checkoutRoutes from './routes/checkout.js';
import plansRoutes from './routes/plans.js';
import ordersRoutes from './routes/orders.js';
import serversRoutes from './routes/servers.js';
import opsRoutes from './routes/ops.js';
import supportRoutes from './routes/support.js';
import marketingRoutes from './routes/marketing.js';
import ticketsRoutes from './routes/tickets.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import affiliatesRoutes from './routes/affiliates.js';
import panelRoutes from './routes/panel.js';
import { validateEnv } from './lib/env.js';
import { createLogger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { authLimiter, publicLimiter, webhookLimiter } from './middleware/rateLimit.js';
import { runReconcilePass } from './jobs/reconcile-provisioning.js';
import { runRefreshPublicServerSnapshots } from './jobs/refresh-public-server-snapshots.js';
import pool from './config/database.js';
import { log as sharedLog } from './lib/sharedLogger.js';
import { attachConsoleWebSocketServer } from './ws/consoleGateway.js';

validateEnv();

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const logger = createLogger();
// Linux /proc/$pid/environ shows the exec-time env from PM2; Node's process.env after loadEnv can differ.
logger.info(
  {
    event: 'paypal_env_effective',
    paypal_sandbox: String(process.env.PAYPAL_SANDBOX ?? ''),
    paypal_client_id_prefix: String(process.env.PAYPAL_CLIENT_ID || '').slice(0, 8),
  },
  'PayPal mode after loadEnv (trust this, not /proc/environ)',
);
const app = express();
// Behind nginx / reverse proxy: restores client IP and keeps express-rate-limit happy (X-Forwarded-For).
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const startTime = Date.now();

try {
  fs.mkdirSync(path.resolve(process.cwd(), 'logs'), { recursive: true });
} catch (e) {
  // non-fatal
}

app.use(requestIdMiddleware);
app.use((req, res, next) => {
  res.on('finish', () => {
    sharedLog(
      { service: 'api', req_id: req.id },
      res.statusCode >= 500 ? 'error' : 'info',
      'request',
      { method: req.method, path: req.originalUrl, status: res.statusCode }
    );
  });
  next();
});
app.use(pinoHttp({ logger, genReqId: (req) => req.id }));

// CORS: dashboard is on www; API on api subdomain — both must be allowed when using split hosts.
// Use FRONTEND_URL (comma-separated) or fall back to PUBLIC_SITE_URL so production isn't stuck on origin:false.
const rawCorsOrigins =
  String(process.env.FRONTEND_URL || '').trim() || String(process.env.PUBLIC_SITE_URL || '').trim();
const corsOriginOption = rawCorsOrigins
  ? rawCorsOrigins.split(',').map((url) => url.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'production'
    ? false
    : true;
const corsOptions = {
  origin: corsOriginOption,
  credentials:
    corsOriginOption === true || (Array.isArray(corsOriginOption) && corsOriginOption.length > 0),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Webhooks must be mounted BEFORE express.json() to preserve raw body
app.use('/api/paypal/webhook', webhookLimiter, paypalWebhookRouter);

// Body parsing middleware (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check: uptime, version, memory
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'givrwrld-api',
    version: pkg.version || process.env.APP_VERSION || '1.0.0',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heapUsed_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal_mb: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});

// Health for agents/monitoring: { ok, ts, version, db, panel } — no secrets
app.get('/api/health', async (req, res) => {
  const ts = new Date().toISOString();
  const version = pkg.version || process.env.APP_VERSION || '1.0.0';
  let db = false;
  let panel = false;
  try {
    await pool.execute('SELECT 1');
    db = true;
  } catch (_) {}
  const panelUrl = process.env.PANEL_URL;
  const panelKey = process.env.PANEL_APP_KEY;
  if (panelUrl && panelKey) {
    try {
      const r = await fetch(`${String(panelUrl).replace(/\/+$/, '')}/api/application/nodes?per_page=1`, {
        headers: { Authorization: `Bearer ${panelKey}`, Accept: 'Application/vnd.pterodactyl.v1+json' },
      });
      panel = r.ok;
    } catch (_) {}
  }
  res.status(200).json({ ok: true, ts, version, db, panel });
});

// Ready: DB ping + required env + optional panel connectivity
app.get('/ready', async (req, res) => {
  const checks = { db: false, env: true, panel: null };
  try {
    await pool.execute('SELECT 1');
    checks.db = true;
  } catch (e) {
    checks.db = false;
  }
  const required = ['MYSQL_PASSWORD', 'JWT_SECRET'];
  for (const k of required) {
    if (!process.env[k] || String(process.env[k]).trim() === '') {
      checks.env = false;
      break;
    }
  }
  const panelUrl = process.env.PANEL_URL;
  const panelKey = process.env.PANEL_APP_KEY;
  if (panelUrl && panelKey) {
    try {
      const r = await fetch(`${String(panelUrl).replace(/\/+$/, '')}/api/application/nodes`, {
        headers: { Authorization: `Bearer ${panelKey}`, Accept: 'Application/vnd.pterodactyl.v1+json' },
      });
      checks.panel = r.ok;
    } catch {
      checks.panel = false;
    }
  }
  const ok = checks.db && checks.env;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// API Routes (rate limits)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/checkout', publicLimiter, checkoutRoutes);
app.use('/api/paypal', publicLimiter, paypalRoutes);
app.use('/api/plans', publicLimiter, plansRoutes);
app.use('/api/orders', publicLimiter, ordersRoutes);
app.use('/api/servers', publicLimiter, serversRoutes);
app.use('/api/support', publicLimiter, supportRoutes);
app.use('/api/marketing', publicLimiter, marketingRoutes);
app.use('/api/tickets', publicLimiter, ticketsRoutes);
app.use('/api/admin', publicLimiter, adminRoutes);
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/affiliates', publicLimiter, affiliatesRoutes);
app.use('/api/panel', publicLimiter, panelRoutes);
app.use('/ops', publicLimiter, opsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  req.log?.error({ err }, 'Server error');
  sharedLog(
    { service: 'api', req_id: req?.id },
    'error',
    'server_error',
    { message: err?.message, status: err.status || 500 }
  );
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Attach WebSocket console gateway
attachConsoleWebSocketServer(server);

// Start server
server.listen(PORT, () => {
  logger.info({ port: PORT }, 'GIVRwrld API Server running');
  // Reconcile job: every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    runReconcilePass(logger).catch((e) => logger.error({ err: e }, 'Reconcile job error'));
  });
  cron.schedule('*/2 * * * *', () => {
    runRefreshPublicServerSnapshots(logger).catch((e) =>
      logger.error({ err: e }, 'Public page snapshot refresh job error')
    );
  });
});

export default app;



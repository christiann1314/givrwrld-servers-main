/**
 * Unauthenticated public endpoints. No PII or internal IDs in responses.
 * Public server pages are read-only and snapshot-backed.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicProvisioningStats } from '../lib/provisioningStats.js';
import { getPublicServerPageBySlug, listPublicStreamerPages } from '../lib/publicServerPages.js';
import { log as sharedLog } from '../lib/sharedLogger.js';

const router = express.Router();
const isDev = process.env.NODE_ENV !== 'production';

const publicServerPageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 300 : 30,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sharedLog(
      { service: 'api', req_id: req.id },
      'warn',
      'public_server_page_rate_limited',
      { slug: req.params?.slug || null }
    );
    res.status(429).json({ error: 'Too many requests' });
  },
});

const publicStreamersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 300 : 60,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sharedLog(
      { service: 'api', req_id: req.id },
      'warn',
      'public_streamers_rate_limited'
    );
    res.status(429).json({ error: 'Too many requests' });
  },
});

/**
 * GET /api/public/provisioning-stats
 * Returns only: median_provisioning_seconds, provision_success_rate_24h, provision_count_24h.
 * No order_id, user_id, or other identifiers.
 */
router.get('/provisioning-stats', async (req, res) => {
  try {
    const stats = await getPublicProvisioningStats();
    res.json(stats);
  } catch (err) {
    console.error('provisioning-stats error:', err?.message || err);
    res.status(500).json({ error: 'Unavailable' });
  }
});

/**
 * GET /api/public/streamers
 * Public directory of enabled streamer pages. No internal IDs or private infra data.
 */
router.get('/streamers', publicStreamersLimiter, async (req, res) => {
  try {
    const streamers = await listPublicStreamerPages();
    return res.json({ streamers });
  } catch (err) {
    sharedLog(
      { service: 'api', req_id: req.id },
      'error',
      'public_streamers_error',
      { message: err?.message || String(err) }
    );
    return res.status(500).json({ error: 'Unavailable' });
  }
});

/**
 * GET /api/public/server/:slug
 * Snapshot-backed public server page data. No internal IDs, panel URLs, or private infra data.
 */
router.get('/server/:slug', publicServerPageLimiter, async (req, res) => {
  try {
    const result = await getPublicServerPageBySlug(req.params.slug);

    if (!result.page) {
      const event = result.reason === 'ineligible' ? 'public_server_page_ineligible' : 'public_server_page_miss';
      sharedLog(
        { service: 'api', req_id: req.id, ...(result.orderId ? { order_id: result.orderId } : {}) },
        result.reason === 'ineligible' ? 'warn' : 'info',
        event,
        { slug: result.slug || null }
      );
      return res.status(404).json({ error: 'Not found' });
    }

    if (result.page.is_stale) {
      sharedLog(
        { service: 'api', req_id: req.id, ...(result.orderId ? { order_id: result.orderId } : {}) },
        'info',
        'public_server_page_stale_served',
        { slug: result.slug }
      );
    }

    return res.json(result.page);
  } catch (err) {
    sharedLog(
      { service: 'api', req_id: req.id },
      'error',
      'public_server_page_error',
      { slug: req.params?.slug || null, message: err?.message || String(err) }
    );
    return res.status(500).json({ error: 'Unavailable' });
  }
});

export default router;

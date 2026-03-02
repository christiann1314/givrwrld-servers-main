/**
 * Unauthenticated public endpoints. No PII or internal IDs in responses.
 * Rate-limited; for provisioning stats only.
 */
import express from 'express';
import { getPublicProvisioningStats } from '../lib/provisioningStats.js';

const router = express.Router();

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

export default router;

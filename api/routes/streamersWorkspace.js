import express from 'express';

/**
 * Lightweight workspace metadata for the Stream Station UI on `/streamers`.
 * Safe public stubs — extend with DB-backed fields when clip/VOD features ship.
 */
const router = express.Router();

router.get('/summary', (_req, res) => {
  res.json({
    ok: true,
    tier: 'free',
    linked_platforms: [],
    linked_max: 5,
    workspace_ready_pct: 39,
    headline: "We're prepping your first workspace.",
    body:
      'Link a platform to pull VODs automatically, or import a file to start clipping right away.',
  });
});

router.get('/analytics/summary', (_req, res) => {
  res.json({
    ok: true,
    headline: "Today's signal",
    status: 'idle',
    clips_today: 0,
    hours_captured: 0,
    note: 'Connect Twitch or Kick on your public server page to unlock live signals here.',
  });
});

export default router;

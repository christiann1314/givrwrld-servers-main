/**
 * Public defaults for Stream Station when the user is logged out or DB tables
 * are not ready. DB-backed routes live in `streamersSuite.js`.
 */
export const PUBLIC_STREAMERS_SUMMARY = {
  ok: true,
  tier: 'free',
  linked_platforms: [],
  linked_max: 5,
  workspace_ready_pct: 39,
  headline: "We're prepping your first workspace.",
  body:
    'Link a platform to pull VODs automatically, or import a file to start clipping right away.',
};

export const PUBLIC_STREAMERS_ANALYTICS = {
  ok: true,
  headline: "Today's signal",
  status: 'idle',
  clips_today: 0,
  hours_captured: 0,
  note: 'Connect Twitch or Kick on your public server page to unlock live signals here.',
};

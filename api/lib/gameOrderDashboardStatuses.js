/**
 * Game orders shown on the customer dashboard (GET /api/servers, metrics/live).
 * Excludes `paid`: checkout is complete but no Panel server exists until the worker
 * claims the order (`provisioning`+). Listing `paid` made post-purge resets look
 * like active servers and drifted from what Pterodactyl actually hosts.
 */
export const DASHBOARD_ACTIVE_GAME_STATUSES = Object.freeze([
  'provisioning',
  'provisioned',
  'configuring',
  'verifying',
  'playable',
  'active',
]);

/**
 * Dashboard rows that should map to an Application API server (external_id / name / id).
 * Excludes `provisioning` because the Panel row may not exist until the worker finishes create.
 */
export const DASHBOARD_STATUSES_REQUIRING_PANEL_SERVER = Object.freeze(
  DASHBOARD_ACTIVE_GAME_STATUSES.filter((s) => s !== 'provisioning'),
);

/**
 * Superset for ops scripts: cancel + clear panel binding for test resets.
 * Includes `paid` (post-purge / pre-provision) even though it is not dashboard-listed.
 */
export const RESETTABLE_GAME_ORDER_STATUSES = Object.freeze([
  'paid',
  ...DASHBOARD_ACTIVE_GAME_STATUSES,
  'error',
  'failed',
]);

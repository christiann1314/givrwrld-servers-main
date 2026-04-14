/**
 * Game orders shown on the customer dashboard (GET /api/servers, metrics/live).
 * Keep in sync with reachability: provisioned → configuring → verifying → playable.
 */
export const DASHBOARD_ACTIVE_GAME_STATUSES = Object.freeze([
  'paid',
  'provisioning',
  'provisioned',
  'configuring',
  'verifying',
  'playable',
  'active',
]);

/**
 * Superset for ops scripts: cancel + clear panel binding for test resets.
 */
export const RESETTABLE_GAME_ORDER_STATUSES = Object.freeze([
  ...DASHBOARD_ACTIVE_GAME_STATUSES,
  'error',
  'failed',
]);

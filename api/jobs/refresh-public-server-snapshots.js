import pool from '../config/database.js';
import { getServerResources, getServerDetails, PterodactylError } from '../services/pterodactylService.js';
import {
  disablePublicPageForOrder,
  isOrderEligibleForPublicPage,
  normalizePublicSnapshotState,
  upsertPublicServerSnapshot,
} from '../lib/publicServerPages.js';

const MAX_PUBLIC_PAGE_REFRESH_PER_PASS = 100;

export async function runRefreshPublicServerSnapshots(logger) {
  const [rows] = await pool.execute(
    `SELECT
        spp.order_id,
        o.status AS order_status,
        o.item_type,
        o.ptero_server_id,
        o.ptero_identifier
     FROM server_public_pages spp
     INNER JOIN orders o ON o.id = spp.order_id
     WHERE spp.public_page_enabled = 1
     ORDER BY spp.updated_at DESC
     LIMIT ?`,
    [MAX_PUBLIC_PAGE_REFRESH_PER_PASS]
  );

  let refreshed = 0;
  let disabled = 0;
  let skipped = 0;

  for (const row of rows) {
    const orderId = String(row.order_id);

    if (!isOrderEligibleForPublicPage(row)) {
      await disablePublicPageForOrder(orderId);
      disabled += 1;
      logger.info?.({ order_id: orderId }, 'public_page_auto_disabled_ineligible');
      continue;
    }

    if (row.ptero_server_id == null || !row.ptero_identifier) {
      await upsertPublicServerSnapshot({
        orderId,
        status: normalizePublicSnapshotState(null, row.order_status),
        playersOnline: 0,
        playersMax: 0,
        joinAddress: null,
        snapshotSource: 'public-refresh',
        capturedAt: new Date(),
      });
      refreshed += 1;
      continue;
    }

    try {
      const resources = await getServerResources(row.ptero_identifier);

      let joinAddress = null;
      try {
        const details = await getServerDetails(row.ptero_server_id);
        const ip = details?.allocations?.primaryIp;
        const port = details?.allocations?.primaryPort;
        if (ip && port) joinAddress = `${ip}:${port}`;
      } catch {
        /* best-effort */
      }

      await upsertPublicServerSnapshot({
        orderId,
        status: resources.state,
        playersOnline: resources.playersOnline ?? 0,
        playersMax: resources.playersMax ?? 0,
        joinAddress,
        snapshotSource: 'public-refresh',
        capturedAt: resources.measuredAt,
      });
      refreshed += 1;
    } catch (err) {
      skipped += 1;

      if (err instanceof PterodactylError) {
        logger.warn?.(
          {
            order_id: orderId,
            ptero_server_id: row.ptero_server_id,
            ptero_identifier: row.ptero_identifier,
            err: err.message,
          },
          'public_page_snapshot_refresh_panel_error'
        );
      } else {
        logger.error?.(
          {
            order_id: orderId,
            ptero_server_id: row.ptero_server_id,
            ptero_identifier: row.ptero_identifier,
            err: err?.message || String(err),
          },
          'public_page_snapshot_refresh_failed'
        );
      }
    }
  }

  logger.info?.(
    {
      total: rows.length,
      refreshed,
      disabled,
      skipped,
    },
    'public_page_snapshot_refresh_complete'
  );
}

export default runRefreshPublicServerSnapshots;

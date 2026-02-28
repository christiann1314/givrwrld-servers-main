// Content throttling: 24h cap, campaign_ad spacing, incident/maintenance no back-to-back.
// All queries use marketing_content_drafts (channel=discord, status in posted/sent_to_discord).

const MAX_DISCORD_PER_24H = Number(process.env.MARKETING_MAX_DISCORD_PER_24H || '6');
const CAMPAIGN_AD_COOLDOWN_HOURS = Number(process.env.MARKETING_CAMPAIGN_AD_COOLDOWN_HOURS || '48');
const SCHEDULED_THEME_INCIDENT_COOLDOWN_HOURS = 24;

/**
 * @param {import('mysql2/promise').Pool} pool
 * @returns {Promise<{ count: number, lastType: string | null, lastPostedAt: Date | null }>}
 */
export async function getRecentDiscordActivity(pool) {
  const [rows] = await pool.execute(
    `SELECT type, posted_at
     FROM marketing_content_drafts
     WHERE channel = 'discord'
       AND status IN ('posted', 'sent_to_discord')
       AND posted_at IS NOT NULL
       AND posted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     ORDER BY posted_at DESC`
  );
  const count = rows.length;
  const last = rows[0] || null;
  return {
    count,
    lastType: last ? last.type : null,
    lastPostedAt: last && last.posted_at ? last.posted_at : null,
  };
}

/**
 * Check if we recently sent a campaign_ad to Discord (within COOLDOWN_HOURS).
 * @param {import('mysql2/promise').Pool} pool
 */
export async function lastDiscordWasCampaignAdWithinCooldown(pool) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM marketing_content_drafts
     WHERE channel = 'discord'
       AND type = 'campaign_ad'
       AND status IN ('posted', 'sent_to_discord')
       AND posted_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     LIMIT 1`,
    [CAMPAIGN_AD_COOLDOWN_HOURS]
  );
  return rows.length > 0;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ type: string }} draft
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function shouldSendDiscordDraft(pool, draft) {
  const activity = await getRecentDiscordActivity(pool);
  if (activity.count >= MAX_DISCORD_PER_24H) {
    return { allowed: false, reason: 'max_discord_per_24h' };
  }
  if (draft.type === 'campaign_ad') {
    const recentAd = await lastDiscordWasCampaignAdWithinCooldown(pool);
    if (recentAd) {
      return { allowed: false, reason: 'campaign_ad_cooldown' };
    }
  }
  if (draft.type === 'incident' && activity.lastType === 'maintenance') {
    return { allowed: false, reason: 'incident_after_maintenance' };
  }
  if (draft.type === 'maintenance' && activity.lastType === 'incident') {
    return { allowed: false, reason: 'maintenance_after_incident' };
  }

  if (draft.type === 'scheduled') {
    const [rows] = await pool.execute(
      `SELECT 1
       FROM marketing_events
       WHERE event_type IN ('incident','maintenance')
         AND occurred_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       LIMIT 1`,
      [SCHEDULED_THEME_INCIDENT_COOLDOWN_HOURS]
    );
    if (rows.length > 0) {
      return { allowed: false, reason: 'scheduled_blocked_by_recent_incident_or_maintenance' };
    }
  }
  return { allowed: true };
}

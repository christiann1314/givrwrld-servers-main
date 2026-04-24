import pool from '../config/database.js';

export const FREE_LIMITS = {
  maxImportsPerDay: 1,
  maxClipsPerDay: 10,
  maxScheduledUpcoming: 5,
  allowedEditKinds: ['ai', 'trim', 'tiktok'],
  exportQuality: '720p',
  storageDays: 14,
  jobPriority: 0,
  watermark: true,
};

export const PREMIUM_LIMITS = {
  maxImportsPerDay: 3,
  maxClipsPerDay: 120,
  maxScheduledUpcoming: 500,
  allowedEditKinds: ['ai', 'trim', 'tiktok', 'montage', 'pro'],
  exportQuality: '1080p',
  storageDays: 90,
  jobPriority: 10,
  watermark: false,
};

function isPremiumRow(row) {
  if (!row) return false;
  return row.tier === 'premium' && row.status === 'active';
}

export async function loadStreamerSubscription(userId) {
  const [[row]] = await pool.query(
    `SELECT user_id, tier, status, billing, current_period_end, paypal_subscription_id, paypal_plan_id
     FROM streamer_subscriptions WHERE user_id = ?`,
    [userId]
  );
  return row || null;
}

export async function getStreamerEntitlements(userId) {
  const row = await loadStreamerSubscription(userId);
  const premium = isPremiumRow(row);
  const limits = premium ? PREMIUM_LIMITS : FREE_LIMITS;

  const [[usage]] = await pool.query(
    `SELECT imports, clips FROM streamer_usage_daily WHERE user_id = ? AND day = UTC_DATE()`,
    [userId]
  );

  const [[{ upcoming } = { upcoming: 0 }]] = await pool.query(
    `SELECT COUNT(*) AS upcoming FROM streamer_scheduled_posts
     WHERE user_id = ? AND status = 'scheduled' AND scheduled_at > UTC_TIMESTAMP()`,
    [userId]
  );

  return {
    tier: premium ? 'premium' : 'free',
    limits,
    usageToday: {
      imports: Number(usage?.imports || 0),
      clips: Number(usage?.clips || 0),
    },
    scheduledUpcoming: Number(upcoming || 0),
    subscription: row,
  };
}

export async function bumpImportUsage(userId) {
  await pool.query(
    `INSERT INTO streamer_usage_daily (user_id, day, imports, clips)
     VALUES (?, UTC_DATE(), 1, 0)
     ON DUPLICATE KEY UPDATE imports = imports + 1`,
    [userId]
  );
}

export async function bumpClipUsage(userId) {
  await pool.query(
    `INSERT INTO streamer_usage_daily (user_id, day, imports, clips)
     VALUES (?, UTC_DATE(), 0, 1)
     ON DUPLICATE KEY UPDATE clips = clips + 1`,
    [userId]
  );
}

export async function upsertSubscriptionFromPayPalResource(paypalSub) {
  const customId = paypalSub.custom_id;
  if (!customId) return;

  const statusRaw = String(paypalSub.status || '').toUpperCase();
  const active = statusRaw === 'ACTIVE';
  const tier = active ? 'premium' : 'free';
  const dbStatus = active
    ? 'active'
    : statusRaw === 'CANCELLED' || statusRaw === 'EXPIRED'
      ? 'cancelled'
      : statusRaw === 'SUSPENDED'
        ? 'suspended'
        : statusRaw === 'APPROVAL_PENDING'
          ? 'approval_pending'
          : 'cancelled';

  const planId = paypalSub.plan_id || null;
  let billing = null;
  if (planId && planId === process.env.PAYPAL_STREAMER_PLAN_MONTHLY) billing = 'monthly';
  else if (planId && planId === process.env.PAYPAL_STREAMER_PLAN_ANNUAL) billing = 'annual';
  else if (planId && planId === process.env.PAYPAL_STREAMER_PLAN_SEMIANNUAL) billing = 'semiannual';
  else if (planId) billing = 'custom';

  const nextBill = paypalSub.billing_info?.next_billing_time;
  const periodEnd = nextBill ? nextBill.replace('T', ' ').replace('Z', '').slice(0, 19) : null;

  await pool.query(
    `INSERT INTO streamer_subscriptions
      (user_id, tier, paypal_subscription_id, paypal_plan_id, billing, status, current_period_end, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       tier = VALUES(tier),
       paypal_subscription_id = VALUES(paypal_subscription_id),
       paypal_plan_id = VALUES(paypal_plan_id),
       billing = VALUES(billing),
       status = VALUES(status),
       current_period_end = VALUES(current_period_end),
       updated_at = UTC_TIMESTAMP()`,
    [customId, tier, paypalSub.id || null, planId, billing, dbStatus, periodEnd]
  );
}

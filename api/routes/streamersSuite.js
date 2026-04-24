/**
 * Streamer suite API — library (streams/VODs), edits (clips), publisher (schedule), jobs.
 * GET /summary, /analytics/summary, /streams accept optional JWT; all other routes require auth.
 * Apply migration `sql/migrations/20260424203000_streamer_suite_schema.sql` on `app_core` first.
 */
import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { PUBLIC_STREAMERS_ANALYTICS, PUBLIC_STREAMERS_SUMMARY } from './streamersWorkspace.js';
import {
  bumpClipUsage,
  bumpImportUsage,
  getStreamerEntitlements,
  upsertSubscriptionFromPayPalResource,
} from '../utils/streamerEntitlements.js';
import {
  createBillingSubscription,
  findApproveLink,
  getBillingSubscription,
} from '../utils/paypalSubscriptions.js';
import { twitchAuthorizeUrl } from '../utils/twitchOAuth.js';
import { googleAuthorizeUrl } from '../utils/googleOAuth.js';
import { kickAuthorizeUrl, kickGeneratePkce } from '../utils/kickOAuth.js';
import { tiktokAuthorizeUrl } from '../utils/tiktokOAuth.js';
import { bumpAnalytics, getAnalyticsSummary } from '../utils/streamerAnalytics.js';

const router = express.Router();

/** Guests + logged-in: a few GETs use optional JWT (cookie or Bearer). All other routes require auth. */
router.use((req, res, next) => {
  const p = (req.path || '/').replace(/\/+$/, '') || '/';
  const isPublicGet =
    req.method === 'GET' && (p === '/summary' || p === '/analytics/summary' || p === '/streams');
  if (isPublicGet) return optionalAuth(req, res, next);
  return authenticate(req, res, next);
});

function mapStreamFilter(q) {
  const f = (q || 'all').toLowerCase();
  if (f === 'processed') return "AND s.status = 'ready'";
  if (f === 'in_progress') return "AND s.status IN ('queued','importing')";
  if (f === 'not_processed') return "AND s.status != 'ready'";
  return '';
}

/** GET /api/streamers/summary */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.json(PUBLIC_STREAMERS_SUMMARY);
    }
    const [[acct]] = await pool.query(
      `SELECT COUNT(*) AS n FROM streamer_platform_accounts WHERE user_id = ?`,
      [userId]
    );
    const [[st]] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(status = 'ready') AS ready,
        SUM(status IN ('queued','importing')) AS inprog
       FROM streamer_streams WHERE user_id = ?`,
      [userId]
    );
    const [[cl]] = await pool.query(
      `SELECT COUNT(*) AS n FROM streamer_clips WHERE user_id = ?`,
      [userId]
    );
    const [[jb]] = await pool.query(
      `SELECT COUNT(*) AS n FROM streamer_jobs WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );
    const [[up]] = await pool.query(
      `SELECT COUNT(*) AS n FROM streamer_scheduled_posts
       WHERE user_id = ? AND status = 'scheduled' AND scheduled_at > UTC_TIMESTAMP()`,
      [userId]
    );
    let ent = null;
    try {
      ent = await getStreamerEntitlements(userId);
    } catch (entErr) {
      console.warn('streamers/summary entitlements', entErr.message);
    }
    res.json({
      success: true,
      summary: {
        connectedAccounts: Number(acct?.n || 0),
        maxConnections: 5,
        streamsTotal: Number(st?.total || 0),
        streamsReady: Number(st?.ready || 0),
        streamsInProgress: Number(st?.inprog || 0),
        clipsTotal: Number(cl?.n || 0),
        jobsPending: Number(jb?.n || 0),
        scheduledUpcoming: Number(up?.n || 0),
        tier: ent?.tier || 'free',
        limits: ent?.limits || null,
        usageToday: ent?.usageToday || { imports: 0, clips: 0 },
        subscriptionStatus: ent?.subscription?.status || 'none',
        exportQuality: ent?.limits?.exportQuality || '720p',
        storageDays: ent?.limits?.storageDays || 14,
      },
    });
  } catch (e) {
    console.error('streamers/summary', e);
    res.json(PUBLIC_STREAMERS_SUMMARY);
  }
});

/** GET /api/streamers/streams?filter=all|processed|in_progress|not_processed */
router.get('/streams', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.json({ success: true, streams: [] });
    }
    const extra = mapStreamFilter(req.query.filter);
    const [rows] = await pool.query(
      `SELECT id, title, source_url, platform, status, duration_seconds, thumbnail_url, error_message, created_at, updated_at
       FROM streamer_streams s
       WHERE user_id = ? ${extra}
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    );
    res.json({ success: true, streams: rows });
  } catch (e) {
    console.error('streamers/streams', e);
    res.json({ success: true, streams: [] });
  }
});

/** POST /api/streamers/streams/import { source_url, title?, platform? } */
router.post('/streams/import', async (req, res) => {
  try {
    const userId = req.userId;
    const { source_url, title, platform } = req.body || {};
    if (!source_url || typeof source_url !== 'string') {
      return res.status(400).json({ success: false, message: 'source_url required' });
    }
    const ent = await getStreamerEntitlements(userId);
    const plat = platform ? String(platform).slice(0, 32) : 'unknown';
    if (plat.toLowerCase() === 'kick' && ent.tier !== 'premium') {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Kick imports are included with Streamer Premium (PayPal).',
      });
    }
    if (ent.usageToday.imports >= ent.limits.maxImportsPerDay) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: `Daily import limit reached (${ent.limits.maxImportsPerDay}/day on your plan). Upgrade to Premium for more imports and Kick support.`,
      });
    }
    const id = uuidv4();
    const t = (title && String(title).trim()) || 'Imported stream';
    const pri = ent.limits.jobPriority;
    await pool.query(
      `INSERT INTO streamer_streams (id, user_id, title, source_url, platform, status)
       VALUES (?, ?, ?, ?, ?, 'queued')`,
      [id, userId, t, source_url, plat]
    );
    const jobId = uuidv4();
    await pool.query(
      `INSERT INTO streamer_jobs (id, user_id, job_type, payload, status, related_stream_id, priority)
       VALUES (?, ?, 'import_stream', ?, 'pending', ?, ?)`,
      [jobId, userId, JSON.stringify({ streamId: id }), id, pri]
    );
    await bumpImportUsage(userId);
    res.status(201).json({ success: true, stream: { id, title: t, status: 'queued' }, jobId });
  } catch (e) {
    console.error('streamers/streams/import', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** GET /api/streamers/clips?kind=ai|... */
router.get('/clips', async (req, res) => {
  try {
    const userId = req.userId;
    const kind = req.query.kind;
    let extra = '';
    const params = [userId];
    if (kind && ['ai', 'tiktok', 'trim', 'montage', 'pro'].includes(String(kind))) {
      extra = ' AND edit_kind = ?';
      params.push(String(kind));
    }
    const [rows] = await pool.query(
      `SELECT id, stream_id, title, edit_kind, status, output_url, duration_label, created_at
       FROM streamer_clips WHERE user_id = ? ${extra}
       ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, clips: rows });
  } catch (e) {
    console.error('streamers/clips', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** POST /api/streamers/clips { title, edit_kind, stream_id? } */
router.post('/clips', async (req, res) => {
  try {
    const userId = req.userId;
    const { title, edit_kind, stream_id } = req.body || {};
    const kind = edit_kind || 'ai';
    if (!['ai', 'tiktok', 'trim', 'montage', 'pro'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'invalid edit_kind' });
    }
    const ent = await getStreamerEntitlements(userId);
    if (!ent.limits.allowedEditKinds.includes(kind)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: `The "${kind}" workflow is part of Streamer Premium (montage / pro tools, faster queue, 1080p).`,
      });
    }
    if (ent.usageToday.clips >= ent.limits.maxClipsPerDay) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: `Daily clip job limit reached (${ent.limits.maxClipsPerDay}/day). Upgrade for higher throughput.`,
      });
    }
    const t = (title && String(title).trim()) || 'New clip';
    const id = uuidv4();
    const pri = ent.limits.jobPriority;
    await pool.query(
      `INSERT INTO streamer_clips (id, user_id, stream_id, title, edit_kind, status)
       VALUES (?, ?, ?, ?, ?, 'queued')`,
      [id, userId, stream_id || null, t, kind]
    );
    const jobId = uuidv4();
    await pool.query(
      `INSERT INTO streamer_jobs (id, user_id, job_type, payload, status, related_clip_id, priority)
       VALUES (?, ?, 'ai_edit', ?, 'pending', ?, ?)`,
      [jobId, userId, JSON.stringify({ clipId: id, kind }), id, pri]
    );
    await bumpClipUsage(userId);
    res.status(201).json({ success: true, clip: { id, title: t, edit_kind: kind, status: 'queued' }, jobId });
  } catch (e) {
    console.error('streamers/clips POST', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** GET /api/streamers/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD */
router.get('/schedule', async (req, res) => {
  try {
    const userId = req.userId;
    const from = (req.query.from || new Date().toISOString().slice(0, 10)).toString().slice(0, 10);
    const to = (req.query.to || new Date(Date.now() + 86400000 * 62).toISOString().slice(0, 10))
      .toString()
      .slice(0, 10);
    const start = `${from} 00:00:00`;
    const end = `${to} 23:59:59`;
    const [rows] = await pool.query(
      `SELECT id, clip_id, title, caption, platforms, scheduled_at, post_kind, status, created_at
       FROM streamer_scheduled_posts
       WHERE user_id = ? AND scheduled_at >= ? AND scheduled_at <= ?
       ORDER BY scheduled_at ASC`,
      [userId, start, end]
    );
    res.json({ success: true, posts: rows });
  } catch (e) {
    console.error('streamers/schedule', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** POST /api/streamers/schedule */
router.post('/schedule', async (req, res) => {
  try {
    const userId = req.userId;
    const { title, caption, platforms, scheduled_at, post_kind, clip_id } = req.body || {};
    if (!title || !scheduled_at) {
      return res.status(400).json({ success: false, message: 'title and scheduled_at required' });
    }
    const ent = await getStreamerEntitlements(userId);
    if (ent.scheduledUpcoming >= ent.limits.maxScheduledUpcoming) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: `Scheduled post limit reached for your plan (${ent.limits.maxScheduledUpcoming} upcoming). Premium unlocks a much higher calendar capacity.`,
      });
    }
    const plats = Array.isArray(platforms) ? platforms : ['twitch'];
    const pk = ['scheduled', 'posted', 'event', 'game_update'].includes(post_kind) ? post_kind : 'scheduled';
    const id = uuidv4();
    await pool.query(
      `INSERT INTO streamer_scheduled_posts
        (id, user_id, clip_id, title, caption, platforms, scheduled_at, post_kind, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [
        id,
        userId,
        clip_id || null,
        String(title).slice(0, 512),
        caption || null,
        JSON.stringify(plats),
        scheduled_at,
        pk,
      ]
    );
    const jobId = uuidv4();
    const pri = ent.limits.jobPriority;
    await pool.query(
      `INSERT INTO streamer_jobs (id, user_id, job_type, payload, status, run_after, priority)
       VALUES (?, ?, 'scheduled_post_publish', ?, 'pending', ?, ?)`,
      [jobId, userId, JSON.stringify({ postId: id }), scheduled_at, pri]
    );
    res.status(201).json({ success: true, post: { id, title, scheduled_at, post_kind: pk }, jobId });
  } catch (e) {
    console.error('streamers/schedule POST', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** POST /api/streamers/subscription/paypal/start { billing?: monthly|annual|semiannual } */
router.post('/subscription/paypal/start', async (req, res) => {
  try {
    const billing = String(req.body?.billing || 'monthly').toLowerCase();
    let planId;
    if (billing === 'annual') planId = process.env.PAYPAL_STREAMER_PLAN_ANNUAL;
    else if (billing === 'semiannual') planId = process.env.PAYPAL_STREAMER_PLAN_SEMIANNUAL;
    else planId = process.env.PAYPAL_STREAMER_PLAN_MONTHLY;
    if (!planId) {
      return res.status(503).json({
        success: false,
        code: 'PAYPAL_NOT_CONFIGURED',
        message:
          'PayPal billing plan IDs are not set. Add PAYPAL_STREAMER_PLAN_MONTHLY (and optional annual / semiannual) from the PayPal developer dashboard.',
      });
    }
    const origin =
      req.headers.origin ||
      process.env.FRONTEND_URL ||
      process.env.PUBLIC_SITE_URL ||
      'http://localhost:8080';
    const base = origin.replace(/\/$/, '');
    const returnUrl = `${base}/streamers?suite_paypal=1`;
    const cancelUrl = `${base}/streamers?suite_paypal=cancel`;
    const sub = await createBillingSubscription({
      planId,
      userId: req.userId,
      email: req.user?.email,
      returnUrl,
      cancelUrl,
    });
    const approvalUrl = findApproveLink(sub);
    if (!approvalUrl) {
      return res.status(502).json({ success: false, message: 'PayPal did not return an approval URL' });
    }
    res.json({ success: true, approvalUrl, subscriptionId: sub.id });
  } catch (e) {
    console.error('streamers/subscription/paypal/start', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** POST /api/streamers/subscription/paypal/sync { subscription_id } — after PayPal return */
router.post('/subscription/paypal/sync', async (req, res) => {
  try {
    const subscriptionId = req.body?.subscription_id;
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return res.status(400).json({ success: false, message: 'subscription_id required' });
    }
    const paypalSub = await getBillingSubscription(subscriptionId);
    if (String(paypalSub.custom_id || '') !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_MISMATCH',
        message: 'This PayPal subscription is not tied to your login.',
      });
    }
    await upsertSubscriptionFromPayPalResource(paypalSub);
    const ent = await getStreamerEntitlements(req.userId);
    res.json({
      success: true,
      tier: ent.tier,
      paypalStatus: paypalSub.status,
      limits: ent.limits,
    });
  } catch (e) {
    console.error('streamers/subscription/paypal/sync', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** GET /api/streamers/playlists */
router.get('/playlists', async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await pool.query(
      `SELECT id, name, created_at FROM streamer_playlists WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, playlists: rows });
  } catch (e) {
    console.error('streamers/playlists', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** POST /api/streamers/playlists { name } */
router.post('/playlists', async (req, res) => {
  try {
    const userId = req.userId;
    const name = (req.body?.name && String(req.body.name).trim()) || 'Playlist';
    const id = uuidv4();
    await pool.query(`INSERT INTO streamer_playlists (id, user_id, name) VALUES (?, ?, ?)`, [
      id,
      userId,
      name.slice(0, 255),
    ]);
    res.status(201).json({ success: true, playlist: { id, name } });
  } catch (e) {
    console.error('streamers/playlists POST', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** GET /api/streamers/oauth/twitch/connect-url — returns Twitch authorize URL (requires DB streamer_oauth_states) */
router.get('/oauth/twitch/connect-url', async (req, res) => {
  try {
    const userId = req.userId;
    const state = crypto.randomBytes(24).toString('hex');
    await insertStreamerOAuthState(pool, {
      userId,
      provider: 'twitch',
      stateToken: state,
      codeVerifier: null,
    });
    const url = twitchAuthorizeUrl({
      state,
      scopes: process.env.TWITCH_OAUTH_SCOPES || undefined,
    });
    res.json({ success: true, url });
  } catch (e) {
    console.error('streamers/oauth/twitch/connect-url', e);
    res.status(503).json({
      success: false,
      message: e.message || 'Twitch OAuth not configured',
      hint: 'Set TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_OAUTH_REDIRECT_URI (callback URL on this API, e.g. …/api/streamers/oauth/twitch/callback)',
    });
  }
});

router.get('/oauth/youtube/connect-url', async (req, res) => {
  try {
    const userId = req.userId;
    const state = crypto.randomBytes(24).toString('hex');
    await insertStreamerOAuthState(pool, {
      userId,
      provider: 'youtube',
      stateToken: state,
      codeVerifier: null,
    });
    const url = googleAuthorizeUrl({ state });
    res.json({ success: true, url });
  } catch (e) {
    console.error('streamers/oauth/youtube/connect-url', e);
    res.status(503).json({
      success: false,
      message: e.message || 'YouTube/Google OAuth not configured',
      hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI (e.g. …/api/streamers/oauth/youtube/callback)',
    });
  }
});

router.get('/oauth/kick/connect-url', async (req, res) => {
  try {
    const userId = req.userId;
    const state = crypto.randomBytes(24).toString('hex');
    const { codeVerifier, codeChallenge } = kickGeneratePkce();
    await insertStreamerOAuthState(pool, {
      userId,
      provider: 'kick',
      stateToken: state,
      codeVerifier,
    });
    const url = kickAuthorizeUrl({ state, codeChallenge });
    res.json({ success: true, url });
  } catch (e) {
    console.error('streamers/oauth/kick/connect-url', e);
    res.status(503).json({
      success: false,
      message: e.message || 'Kick OAuth not configured',
      hint: 'Set KICK_CLIENT_ID, KICK_CLIENT_SECRET, KICK_OAUTH_REDIRECT_URI (e.g. …/api/streamers/oauth/kick/callback). PKCE is required by Kick.',
    });
  }
});

router.get('/oauth/tiktok/connect-url', async (req, res) => {
  try {
    const userId = req.userId;
    const state = crypto.randomBytes(24).toString('hex');
    await insertStreamerOAuthState(pool, {
      userId,
      provider: 'tiktok',
      stateToken: state,
      codeVerifier: null,
    });
    const url = tiktokAuthorizeUrl({ state });
    res.json({ success: true, url });
  } catch (e) {
    console.error('streamers/oauth/tiktok/connect-url', e);
    res.status(503).json({
      success: false,
      message: e.message || 'TikTok OAuth not configured',
      hint: 'Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_OAUTH_REDIRECT_URI (must match Login Kit redirect in TikTok developer portal)',
    });
  }
});

/** POST /api/streamers/assistant { prompt } — optional OpenAI; stores transcript when tables exist */
router.post('/assistant', async (req, res) => {
  try {
    const userId = req.userId;
    const prompt = String(req.body?.prompt || '').trim().slice(0, 12000);
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'prompt required' });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return res.json({
        success: true,
        configured: false,
        reply:
          'Assistant LLM is not configured. Set OPENAI_API_KEY on the API server to get clip ideas, captions, schedules, and template advice grounded in Stream Station.',
      });
    }

    try {
      await pool.query(
        `INSERT INTO streamer_assistant_messages (id, user_id, role, content) VALUES (?, ?, 'user', ?)`,
        [uuidv4(), userId, prompt]
      );
    } catch (logErr) {
      console.warn('assistant log user', logErr.message);
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are GIVR Stream Station assistant for game streamers. Be concise and actionable. Topics: clipping, vertical 9:16, captions, posting cadence, Twitch/YouTube/Kick workflows.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const raw = await r.text();
    let json = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(502).json({ success: false, message: raw || 'OpenAI error' });
    }
    if (!r.ok) {
      return res.status(502).json({ success: false, message: json.error?.message || raw || 'OpenAI error' });
    }
    const reply = json.choices?.[0]?.message?.content?.trim() || 'No response.';
    try {
      await pool.query(
        `INSERT INTO streamer_assistant_messages (id, user_id, role, content) VALUES (?, ?, 'assistant', ?)`,
        [uuidv4(), userId, reply.slice(0, 16000)]
      );
      try {
        await bumpAnalytics(userId, 'assistant_turns');
      } catch (bumpErr) {
        console.warn('assistant analytics', bumpErr.message);
      }
    } catch (logErr) {
      console.warn('assistant log reply', logErr.message);
    }
    res.json({ success: true, configured: true, reply, model });
  } catch (e) {
    console.error('streamers/assistant', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** GET /api/streamers/analytics/summary */
router.get('/analytics/summary', async (req, res) => {
  try {
    if (!req.userId) {
      return res.json(PUBLIC_STREAMERS_ANALYTICS);
    }
    const summary = await getAnalyticsSummary(req.userId);
    res.json({ success: true, analytics: summary });
  } catch (e) {
    console.error('streamers/analytics/summary', e);
    res.json(PUBLIC_STREAMERS_ANALYTICS);
  }
});

/** Stub link for demos — replace with OAuth token exchange in production */
router.post('/accounts/stub-connect', async (req, res) => {
  try {
    const userId = req.userId;
    const { provider, display_name } = req.body || {};
    const p = ['twitch', 'youtube', 'kick', 'tiktok', 'facebook', 'x'].includes(provider) ? provider : 'twitch';
    const ext = `stub_${userId}`;
    const name = (display_name || `${p} (demo)`).slice(0, 255);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO streamer_platform_accounts (id, user_id, provider, external_user_id, display_name)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         external_user_id = VALUES(external_user_id),
         updated_at = CURRENT_TIMESTAMP`,
      [id, userId, p, ext, name]
    );
    res.json({
      success: true,
      message:
        'Linked (demo). Configure Twitch/YouTube/Kick OAuth apps and token storage for production-grade sync.',
    });
  } catch (e) {
    console.error('streamers/stub-connect', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

/**
 * Rate limit presets: auth, public, webhook (safe for PayPal retries).
 * In development, limits are much higher so login and /api/auth/me don't trip during local testing.
 */
import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 50,
  message: { error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 1000 : 120,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Webhook: allow enough for PayPal retries; do not block legitimate delivery. */
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 500 : 100,
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

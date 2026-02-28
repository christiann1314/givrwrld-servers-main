// Authentication Routes
import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/email.js';
import { getDecryptedSecret, getOrCreatePterodactylUser } from '../utils/mysql.js';

const router = express.Router();

function randomPanelPassword() {
  // Include upper/lower/digit/symbol for panel validation and better entropy.
  return `Givr!${crypto.randomBytes(12).toString('base64url')}7a`;
}

async function resolvePanelCredentials() {
  const aesKey = process.env.AES_KEY;
  const panelUrlRaw = (aesKey ? await getDecryptedSecret('panel', 'PANEL_URL', aesKey) : null) || process.env.PANEL_URL;
  const panelAppKey = (aesKey ? await getDecryptedSecret('panel', 'PANEL_APP_KEY', aesKey) : null) || process.env.PANEL_APP_KEY;

  if (!panelUrlRaw || !panelAppKey) {
    throw new Error('Pterodactyl panel is not configured. Set PANEL_URL and PANEL_APP_KEY.');
  }

  return {
    panelUrl: String(panelUrlRaw).replace(/\/+$/, ''),
    panelAppKey,
  };
}

async function fetchPanelUserById(panelUrl, panelAppKey, pteroUserId) {
  const res = await fetch(`${panelUrl}/api/application/users/${pteroUserId}`, {
    headers: {
      Authorization: `Bearer ${panelAppKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.attributes || null;
}

async function fetchPanelUserByEmail(panelUrl, panelAppKey, email) {
  const res = await fetch(`${panelUrl}/api/application/users?filter[email]=${encodeURIComponent(email)}`, {
    headers: {
      Authorization: `Bearer ${panelAppKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data?.[0]?.attributes || null;
}

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, display_name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const [existing] = await pool.execute(
      `SELECT id, is_email_verified, display_name FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    if (existing.length > 0 && Number(existing[0].is_email_verified) === 1) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = existing.length > 0 ? existing[0].id : uuidv4();
    const displayName = firstName && lastName
      ? `${firstName} ${lastName}`.trim()
      : (display_name || email.split('@')[0]);

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE users
         SET password_hash = ?, display_name = ?, is_email_verified = 0, email_verified_at = NULL, updated_at = NOW()
         WHERE id = ?`,
        [passwordHash, displayName, userId]
      );
    } else {
      await pool.execute(
        `INSERT INTO users (id, email, password_hash, display_name, is_email_verified, created_at)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        [userId, normalizedEmail, passwordHash, displayName]
      );
      // Assign default 'user' role
      const [roleRows] = await pool.execute(`SELECT id FROM roles WHERE code = 'user' LIMIT 1`);
      if (roleRows.length > 0) {
        await pool.execute(
          `INSERT IGNORE INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)`,
          [uuidv4(), userId, roleRows[0].id]
        );
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await pool.execute(`DELETE FROM email_verification_tokens WHERE user_id = ?`, [userId]);
    await pool.execute(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [userId, tokenHash]
    );

    const frontendBase = process.env.PUBLIC_SITE_URL
      || process.env.FRONTEND_URL?.split(',')[0]?.trim()
      || 'http://localhost:8080';
    const verifyUrl = `${frontendBase}/auth?verify_token=${rawToken}`;
    let deliveryMode = 'email';
    try {
      await sendVerificationEmail({ toEmail: normalizedEmail, verifyUrl });
    } catch (mailErr) {
      if (process.env.NODE_ENV === 'production') {
        throw mailErr;
      }
      deliveryMode = 'dev-link';
      console.warn('Verification email delivery fallback (dev-link):', mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: deliveryMode === 'email'
        ? 'Verification email sent. Please confirm your email before signing in.'
        : `SMTP not configured. Use this verification link in local dev: ${verifyUrl}`,
      pendingVerification: true,
      ...(deliveryMode === 'dev-link' ? { devVerificationUrl: verifyUrl } : {})
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Signup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Find user
    const [users] = await pool.execute(
      `SELECT id, email, password_hash, display_name, is_email_verified FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = users[0];

    if (Number(user.is_email_verified) !== 1) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before signing in.'
      });
    }

    // Verify password
    // MariaDB can return VARBINARY as Buffer; bcrypt.compare expects string hash.
    const storedHash = Buffer.isBuffer(user.password_hash)
      ? user.password_hash.toString('utf8')
      : String(user.password_hash || '');

    if (!storedHash) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate tokens
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, email, display_name, is_email_verified, created_at FROM users WHERE id = ?`,
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const [roleRows] = await pool.execute(
      `SELECT r.code FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [req.userId]
    );
    const roles = roleRows.map((r) => r.code);

    res.json({
      success: true,
      user: { ...users[0], roles }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should remove token)
 */
router.post('/logout', authenticate, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // You could implement token blacklisting here if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      });
    }

    // Verify refresh token (uses separate secret)
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const token = generateToken({ userId: decoded.userId, email: decoded.email });

    res.json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify account email by token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const [rows] = await pool.execute(
      `SELECT user_id
       FROM email_verification_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    const userId = rows?.[0]?.user_id;
    if (!userId) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'Verification link is invalid or has expired.'
      });
    }

    await pool.execute(
      `UPDATE users SET is_email_verified = 1, email_verified_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [userId]
    );
    await pool.execute(
      `UPDATE email_verification_tokens SET used_at = NOW() WHERE token_hash = ?`,
      [tokenHash]
    );

    return res.json({
      success: true,
      message: 'Email verified successfully. You can now sign in.'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      error: 'Email verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification link for unverified account
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [users] = await pool.execute(
      `SELECT id, is_email_verified FROM users WHERE email = ?`,
      [normalizedEmail]
    );
    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account exists with that email.'
      });
    }
    const user = users[0];
    if (Number(user.is_email_verified) === 1) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'This account is already verified.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await pool.execute(`DELETE FROM email_verification_tokens WHERE user_id = ?`, [user.id]);
    await pool.execute(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [user.id, tokenHash]
    );

    const frontendBase = process.env.PUBLIC_SITE_URL
      || process.env.FRONTEND_URL?.split(',')[0]?.trim()
      || 'http://localhost:8080';
    const verifyUrl = `${frontendBase}/auth?verify_token=${rawToken}`;
    let deliveryMode = 'email';
    try {
      await sendVerificationEmail({ toEmail: normalizedEmail, verifyUrl });
    } catch (mailErr) {
      if (process.env.NODE_ENV === 'production') {
        throw mailErr;
      }
      deliveryMode = 'dev-link';
      console.warn('Verification resend fallback (dev-link):', mailErr.message);
    }

    return res.json({
      success: true,
      message: deliveryMode === 'email'
        ? 'Verification email sent.'
        : `SMTP not configured. Use this verification link in local dev: ${verifyUrl}`,
      ...(deliveryMode === 'dev-link' ? { devVerificationUrl: verifyUrl } : {})
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({
      error: 'Failed to resend verification email',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/pterodactyl-credentials
 * Returns panel URL, email and linked panel user id.
 * Password is not returned unless a reset is explicitly requested.
 */
router.get('/pterodactyl-credentials', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, email, display_name, pterodactyl_user_id FROM users WHERE id = ? LIMIT 1`,
      [req.userId]
    );
    const user = rows?.[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { panelUrl, panelAppKey } = await resolvePanelCredentials();
    const pterodactylUserId = await getOrCreatePterodactylUser(
      user.id,
      user.email,
      user.display_name || user.email.split('@')[0],
      panelUrl,
      panelAppKey
    );

    return res.json({
      success: true,
      credentials: {
        email: user.email,
        pterodactyl_user_id: pterodactylUserId,
        panel_url: panelUrl,
        password: '',
      },
      message: 'Panel account linked. Use "Reset Panel Password" to generate a login password.',
    });
  } catch (error) {
    console.error('Get pterodactyl credentials error:', error);
    return res.status(500).json({
      error: 'Failed to fetch Pterodactyl credentials',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/pterodactyl-credentials/reset
 * Ensures linked panel user exists, resets panel password, and returns credentials.
 */
/**
 * POST /api/auth/panel-sync-user
 * Ensure Pterodactyl panel user exists for the authenticated user (replaces Supabase panel-sync-user).
 */
router.post('/panel-sync-user', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, email, display_name FROM users WHERE id = ? LIMIT 1`,
      [req.userId]
    );
    const user = rows?.[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { panelUrl, panelAppKey } = await resolvePanelCredentials();
    const pterodactylUserId = await getOrCreatePterodactylUser(
      user.id,
      user.email,
      user.display_name || user.email?.split('@')[0] || user.email,
      panelUrl,
      panelAppKey
    );
    let panelUsername = user.email?.split('@')[0] || `user-${user.id}`;
    try {
      const panelUser = await fetchPanelUserById(panelUrl, panelAppKey, pterodactylUserId);
      if (panelUser?.username) panelUsername = panelUser.username;
    } catch {
      // ignore
    }
    return res.json({
      pterodactyl_user_id: pterodactylUserId,
      panel_username: panelUsername,
      last_synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Panel sync user error:', error);
    res.status(500).json({
      error: 'Failed to create panel account',
      message: error?.message,
    });
  }
});

router.post('/pterodactyl-credentials/reset', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, email, display_name, pterodactyl_user_id FROM users WHERE id = ? LIMIT 1`,
      [req.userId]
    );
    const user = rows?.[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { panelUrl, panelAppKey } = await resolvePanelCredentials();
    const pterodactylUserId = await getOrCreatePterodactylUser(
      user.id,
      user.email,
      user.display_name || user.email.split('@')[0],
      panelUrl,
      panelAppKey
    );

    let panelUser = await fetchPanelUserById(panelUrl, panelAppKey, pterodactylUserId);
    if (!panelUser) {
      panelUser = await fetchPanelUserByEmail(panelUrl, panelAppKey, user.email);
    }
    if (!panelUser) {
      return res.status(404).json({ error: 'Pterodactyl user not found' });
    }

    const newPassword = randomPanelPassword();
    const updateRes = await fetch(`${panelUrl}/api/application/users/${panelUser.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${panelAppKey}`,
        'Content-Type': 'application/json',
        Accept: 'Application/vnd.pterodactyl.v1+json',
      },
      body: JSON.stringify({
        email: panelUser.email,
        username: panelUser.username,
        first_name: panelUser.first_name || panelUser.name_first || 'User',
        last_name: panelUser.last_name || panelUser.name_last || 'User',
        language: panelUser.language || 'en',
        root_admin: !!panelUser.root_admin,
        password: newPassword,
      }),
    });

    if (!updateRes.ok) {
      const body = await updateRes.text();
      throw new Error(`Failed to reset panel password: ${body}`);
    }

    return res.json({
      success: true,
      credentials: {
        email: user.email,
        pterodactyl_user_id: panelUser.id,
        panel_url: panelUrl,
        password: newPassword,
      },
      message: 'Pterodactyl password reset successfully.',
    });
  } catch (error) {
    console.error('Reset pterodactyl credentials error:', error);
    return res.status(500).json({
      error: 'Failed to reset Pterodactyl credentials',
      message: error.message,
    });
  }
});

export default router;



// JWT Utility Functions
import jwt from 'jsonwebtoken';

// Use separate secrets for access and refresh tokens
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Require JWT_SECRET in production
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  Using default JWT_SECRET - NOT SECURE FOR PRODUCTION');
}

/**
 * Generate JWT access token
 */
export function generateToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Generate refresh token (uses separate secret)
 */
export function generateRefreshToken(payload) {
  const secret = JWT_REFRESH_SECRET || JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET not configured');
  }
  return jwt.sign(payload, secret, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });
}

/**
 * Verify JWT access token
 */
export function verifyToken(token) {
  if (!JWT_SECRET) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token (uses separate secret)
 */
export function verifyRefreshToken(token) {
  const secret = JWT_REFRESH_SECRET || JWT_SECRET;
  if (!secret) {
    return null;
  }
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token) {
  return jwt.decode(token);
}



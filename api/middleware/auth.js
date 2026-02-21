// Authentication Middleware
import { verifyToken } from '../utils/jwt.js';

/**
 * Verify JWT token from Authorization header
 */
export function authenticate(req, res, next) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.userId || decoded.id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req, res, next) {
  try {
    // Get token from Authorization header only
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
        req.userId = decoded.userId || decoded.id;
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
}



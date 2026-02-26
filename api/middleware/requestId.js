/**
 * Request correlation ID middleware.
 * Sets req.id and res.set('X-Request-Id', id).
 */
import { randomUUID } from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.id = id;
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

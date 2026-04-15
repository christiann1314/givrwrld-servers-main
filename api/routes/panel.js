/**
 * Pterodactyl Client API proxy for game panel tabs.
 * Each route authenticates the user, verifies order ownership,
 * resolves the ptero_identifier, and proxies to the Panel Client API.
 */
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { getLogger } from '../lib/logger.js';

const logger = getLogger();
const router = express.Router();

const PANEL_URL = (process.env.PANEL_URL || '').replace(/\/+$/, '');
const CLIENT_KEY = process.env.PTERO_CLIENT_KEY || '';

async function resolveIdentifier(orderId, userId) {
  const [rows] = await pool.execute(
    `SELECT o.ptero_identifier FROM orders o
     WHERE o.id = ? AND o.user_id = ? AND o.item_type = 'game' AND o.ptero_identifier IS NOT NULL
     LIMIT 1`,
    [orderId, userId],
  );
  return rows?.[0]?.ptero_identifier || null;
}

async function panelClient(path, { method = 'GET', body, query } = {}) {
  let url = `${PANEL_URL}/api/client${path}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${CLIENT_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}

function proxyHandler(buildPath, { method = 'GET', bodyFromReq } = {}) {
  return async (req, res) => {
    try {
      const identifier = await resolveIdentifier(req.params.orderId, req.userId);
      if (!identifier) return res.status(404).json({ error: 'Server not found or not provisioned' });
      const path = buildPath(identifier, req);
      const query = method === 'GET' ? req.query : undefined;
      const body = bodyFromReq ? bodyFromReq(req) : (method !== 'GET' ? req.body : undefined);
      const result = await panelClient(path, { method, body, query });
      res.status(result.status).json(result.json ?? { raw: result.text });
    } catch (err) {
      logger.error({ err: err?.message, orderId: req.params.orderId }, 'Panel proxy error');
      res.status(502).json({ error: 'Panel request failed' });
    }
  };
}

// ── Files ──
router.get('/:orderId/files/list', authenticate,
  proxyHandler((id, req) => `/servers/${id}/files/list`, { method: 'GET' }));
router.get('/:orderId/files/contents', authenticate,
  proxyHandler((id) => `/servers/${id}/files/contents`, { method: 'GET' }));
router.post('/:orderId/files/write', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const file = req.query.file;
    if (!file) return res.status(400).json({ error: 'file query param required' });
    let url = `${PANEL_URL}/api/client/servers/${identifier}/files/write?file=${encodeURIComponent(file)}`;
    const contentType = req.headers['content-type'] || 'application/json';
    const isRaw = contentType.startsWith('text/');
    const body = isRaw ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : JSON.stringify(req.body);
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLIENT_KEY}`,
        Accept: 'application/json',
        'Content-Type': isRaw ? 'text/plain' : 'application/json',
      },
      body,
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    res.status(r.status).json(json ?? { success: r.ok });
  } catch (err) {
    logger.error({ err: err?.message, orderId: req.params.orderId }, 'Panel file write error');
    res.status(502).json({ error: 'File write failed' });
  }
});
router.post('/:orderId/files/rename', authenticate,
  proxyHandler((id) => `/servers/${id}/files/rename`, { method: 'POST' }));
router.post('/:orderId/files/delete', authenticate,
  proxyHandler((id) => `/servers/${id}/files/delete`, { method: 'POST' }));
router.post('/:orderId/files/create-folder', authenticate,
  proxyHandler((id) => `/servers/${id}/files/create-folder`, { method: 'POST' }));
router.get('/:orderId/files/download', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const file = req.query.file;
    if (!file) return res.status(400).json({ error: 'file param required' });
    const result = await panelClient(`/servers/${identifier}/files/download`, { query: { file } });
    if (!result.ok) return res.status(result.status).json(result.json ?? { error: 'Download failed' });
    res.json(result.json);
  } catch (err) {
    res.status(502).json({ error: 'Download URL request failed' });
  }
});

// ── Databases ──
router.get('/:orderId/databases', authenticate,
  proxyHandler((id) => `/servers/${id}/databases`));
router.post('/:orderId/databases', authenticate,
  proxyHandler((id) => `/servers/${id}/databases`, { method: 'POST' }));
router.delete('/:orderId/databases/:dbId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/databases/${req.params.dbId}`, { method: 'DELETE' });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    res.status(502).json({ error: 'Database delete failed' });
  }
});
router.post('/:orderId/databases/:dbId/rotate-password', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/databases/${req.params.dbId}/rotate-password`, { method: 'POST' });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    res.status(502).json({ error: 'Password rotate failed' });
  }
});

// ── Schedules ──
router.get('/:orderId/schedules', authenticate,
  proxyHandler((id) => `/servers/${id}/schedules`));
router.post('/:orderId/schedules', authenticate,
  proxyHandler((id) => `/servers/${id}/schedules`, { method: 'POST' }));
router.get('/:orderId/schedules/:scheduleId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/schedules/${req.params.scheduleId}`);
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'Schedule fetch failed' });
  }
});
router.post('/:orderId/schedules/:scheduleId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/schedules/${req.params.scheduleId}`, { method: 'POST', body: req.body });
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'Schedule update failed' });
  }
});
router.delete('/:orderId/schedules/:scheduleId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/schedules/${req.params.scheduleId}`, { method: 'DELETE' });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    res.status(502).json({ error: 'Schedule delete failed' });
  }
});

// ── Sub-users ──
router.get('/:orderId/users', authenticate,
  proxyHandler((id) => `/servers/${id}/users`));
router.post('/:orderId/users', authenticate,
  proxyHandler((id) => `/servers/${id}/users`, { method: 'POST' }));
router.get('/:orderId/users/:subUserId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/users/${req.params.subUserId}`);
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'User fetch failed' });
  }
});
router.post('/:orderId/users/:subUserId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/users/${req.params.subUserId}`, { method: 'POST', body: req.body });
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'User update failed' });
  }
});
router.delete('/:orderId/users/:subUserId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/users/${req.params.subUserId}`, { method: 'DELETE' });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    res.status(502).json({ error: 'User delete failed' });
  }
});

// ── Backups ──
router.get('/:orderId/backups', authenticate,
  proxyHandler((id) => `/servers/${id}/backups`));
router.post('/:orderId/backups', authenticate,
  proxyHandler((id) => `/servers/${id}/backups`, { method: 'POST' }));
router.get('/:orderId/backups/:backupId/download', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/backups/${req.params.backupId}/download`);
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'Backup download failed' });
  }
});
router.post('/:orderId/backups/:backupId/restore', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/backups/${req.params.backupId}/restore`, { method: 'POST', body: req.body });
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'Backup restore failed' });
  }
});
router.delete('/:orderId/backups/:backupId', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/backups/${req.params.backupId}`, { method: 'DELETE' });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    res.status(502).json({ error: 'Backup delete failed' });
  }
});

// ── Network (allocations) ──
router.get('/:orderId/network', authenticate,
  proxyHandler((id) => `/servers/${id}/network/allocations`));
router.post('/:orderId/network/:allocId/primary', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/network/allocations/${req.params.allocId}/primary`, { method: 'POST' });
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    res.status(502).json({ error: 'Set primary allocation failed' });
  }
});

// ── Startup ──
router.get('/:orderId/startup', authenticate,
  proxyHandler((id) => `/servers/${id}/startup`));
router.put('/:orderId/startup/variable', authenticate,
  proxyHandler((id) => `/servers/${id}/startup/variable`, { method: 'PUT' }));

// ── Activity ──
router.get('/:orderId/activity', authenticate,
  proxyHandler((id) => `/servers/${id}/activity`, { method: 'GET' }));

// ── Server Details (includes SFTP info) ──
router.get('/:orderId/details', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}`);
    res.status(result.status).json(result.json ?? {});
  } catch (err) {
    logger.error({ err: err?.message, orderId: req.params.orderId }, 'Panel details proxy error');
    res.status(502).json({ error: 'Panel request failed' });
  }
});

// ── Settings ──
router.post('/:orderId/settings/rename', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/settings/rename`, {
      method: 'POST',
      body: req.body,
    });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    logger.error({ err: err?.message, orderId: req.params.orderId }, 'Panel rename proxy error');
    res.status(502).json({ error: 'Rename request failed' });
  }
});

router.post('/:orderId/settings/reinstall', authenticate, async (req, res) => {
  try {
    const identifier = await resolveIdentifier(req.params.orderId, req.userId);
    if (!identifier) return res.status(404).json({ error: 'Server not found' });
    const result = await panelClient(`/servers/${identifier}/settings/reinstall`, { method: 'POST' });
    res.status(result.status).json(result.json ?? { success: result.ok });
  } catch (err) {
    logger.error({ err: err?.message, orderId: req.params.orderId }, 'Panel reinstall proxy error');
    res.status(502).json({ error: 'Reinstall request failed' });
  }
});

export default router;

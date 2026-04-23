// Plans Route
import express from 'express';
import { getAllPlans } from '../utils/mysql.js';
import pool from '../config/database.js';

const router = express.Router();

/**
 * GET /api/plans/nest/:nestSlug/eggs
 * Eggs currently in a Panel nest (synced into `ptero_eggs` / `ptero_nests`), e.g. `Minecraft` or `Rust`.
 * Used so configure UIs match the live Panel nest contents.
 */
router.get('/nest/:nestSlug/eggs', async (req, res) => {
  try {
    const nestSlug = String(req.params.nestSlug || '').trim();
    if (!nestSlug) {
      return res.status(400).json({ success: false, error: 'nest slug is required' });
    }
    const [rows] = await pool.execute(
      `SELECT e.ptero_egg_id AS ptero_egg_id,
              e.name AS name,
              e.ptero_nest_id AS ptero_nest_id,
              n.name AS nest_name
         FROM ptero_eggs e
         INNER JOIN ptero_nests n ON n.ptero_nest_id = e.ptero_nest_id
        WHERE LOWER(n.name) = LOWER(?)
        ORDER BY e.name ASC`,
      [nestSlug]
    );
    res.json({ success: true, eggs: rows });
  } catch (error) {
    console.error('Get nest eggs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nest eggs',
      message: error.message,
    });
  }
});

/**
 * GET /api/plans
 * Get all active plans
 */
router.get('/', async (req, res) => {
  try {
    const plans = await getAllPlans();
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      error: 'Failed to fetch plans',
      message: error.message
    });
  }
});

/**
 * GET /api/plans/catalog
 * Returns plans grouped by game and egg/server type
 */
router.get('/catalog', async (req, res) => {
  try {
    const plans = await getAllPlans();
    const byGame = new Map();

    for (const plan of plans) {
      const game = String(plan.game || 'unknown').toLowerCase();
      const eggId = Number(plan.ptero_egg_id || 0);
      const eggName = plan.ptero_egg_name || `Egg ${eggId || 'Unassigned'}`;

      if (!byGame.has(game)) {
        byGame.set(game, {
          game,
          plans: [],
          eggs: new Map(),
        });
      }

      const gameEntry = byGame.get(game);
      gameEntry.plans.push(plan);
      if (!gameEntry.eggs.has(eggId)) {
        gameEntry.eggs.set(eggId, {
          ptero_egg_id: eggId || null,
          ptero_egg_name: eggName,
          ptero_nest_id: plan.ptero_nest_id || null,
          plans: [],
        });
      }
      gameEntry.eggs.get(eggId).plans.push(plan);
    }

    const games = Array.from(byGame.values()).map((entry) => ({
      game: entry.game,
      plans: entry.plans,
      eggs: Array.from(entry.eggs.values()),
    }));

    res.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error('Get plan catalog error:', error);
    res.status(500).json({
      error: 'Failed to fetch plan catalog',
      message: error.message,
    });
  }
});

export default router;



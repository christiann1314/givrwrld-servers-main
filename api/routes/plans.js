// Plans Route
import express from 'express';
import { getAllPlans } from '../utils/mysql.js';

const router = express.Router();

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



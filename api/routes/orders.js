// Orders Route
import express from 'express';
import { getUserOrders } from '../utils/mysql.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/orders
 * Get user's orders
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await getUserOrders(req.userId);
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

export default router;



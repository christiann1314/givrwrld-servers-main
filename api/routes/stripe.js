// Stripe Webhook Route
import express from 'express';
import Stripe from 'stripe';
import { getDecryptedSecret, getPlan, createOrder, updateOrderStatus } from '../utils/mysql.js';
import { v4 as uuidv4 } from 'uuid';
import { provisionServer } from './servers.js';
import pool from '../config/database.js';

const router = express.Router();

// Stripe webhook endpoint (no auth required - uses signature verification)
// This route is mounted BEFORE express.json() in server.js to preserve raw body
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Get AES key and decrypt Stripe secrets
    const aesKey = process.env.AES_KEY;
    if (!aesKey) {
      throw new Error('AES_KEY environment variable not set');
    }

    const stripeSecretKey = await getDecryptedSecret('stripe', 'STRIPE_SECRET_KEY', aesKey);
    const stripeWebhookSecret = await getDecryptedSecret('stripe', 'STRIPE_WEBHOOK_SECRET', aesKey);

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe secrets not found in MySQL');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey);

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Log event first
    try {
      await pool.execute(
        `INSERT INTO stripe_events_log (event_id, type, payload, received_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
        [event.id, event.type, JSON.stringify(event)]
      );
    } catch (logError) {
      console.warn('Failed to log Stripe event:', logError);
      // Continue processing even if logging fails
    }

    // Handle event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (!session.metadata || !session.metadata.user_id) {
          return res.status(400).json({
            error: 'Missing required metadata',
            received: false
          });
        }

        if (session.mode === 'subscription' && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);

            // Get order_id from metadata (order was created during checkout)
            const orderId = session.metadata?.order_id;
            
            if (!orderId) {
              console.error('No order_id in session metadata');
              return res.status(400).json({
                error: 'Missing order_id in session metadata'
              });
            }

            // Update order status to paid
            await pool.execute(
              `UPDATE orders 
               SET status = 'paid',
                   stripe_sub_id = ?,
                   stripe_customer_id = ?
               WHERE id = ? AND status = 'pending'`,
              [subscription.id, session.customer, orderId]
            );

            // Update order_sessions status
            await pool.execute(
              `UPDATE order_sessions 
               SET status = 'completed' 
               WHERE stripe_session_id = ?`,
              [session.id]
            );

            // Log event
            await pool.execute(
              `INSERT INTO stripe_events_log (event_id, type, payload, received_at)
               VALUES (?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
              [event.id, event.type, JSON.stringify(event)]
            );

            console.log('Order updated to paid:', orderId);

            // Trigger server provisioning for game servers
            if (session.metadata.item_type === 'game') {
              // Call provisioning function directly (no HTTP call needed)
              try {
                const result = await provisionServer(orderId);
                console.log('✅ Server provisioning completed for order:', orderId, result);
              } catch (provisionError) {
                console.error('Failed to provision server:', provisionError);
                await updateOrderStatus(orderId, 'error', null, null, provisionError.message || 'Failed to provision server');
              }
            }
          } catch (error) {
            console.error('Error processing checkout:', error);
            return res.status(500).json({ error: error.message });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : 'paid';
        
        // Update order status
        await pool.execute(
          `UPDATE orders SET status = ? WHERE stripe_sub_id = ?`,
          [status, subscription.id]
        );

        // Update or insert subscription record
        if (subscription.metadata?.order_id) {
          await pool.execute(
            `INSERT INTO stripe_subscriptions (order_id, stripe_sub_id, status, current_period_end, created_at, updated_at)
             VALUES (?, ?, ?, FROM_UNIXTIME(?), NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
               status = VALUES(status),
               current_period_end = VALUES(current_period_end),
               updated_at = NOW()`,
            [subscription.metadata.order_id, subscription.id, subscription.status, subscription.current_period_end]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const pool = (await import('../config/database.js')).default;
          await pool.execute(
            `UPDATE orders SET status = 'error' WHERE stripe_sub_id = ?`,
            [invoice.subscription]
          );
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


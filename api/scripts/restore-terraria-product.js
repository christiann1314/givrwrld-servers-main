#!/usr/bin/env node
/**
 * Restore Terraria Product and Prices in Stripe
 * 
 * This script will:
 * 1. Check for Terraria plans in the database
 * 2. Create a Stripe product for Terraria (or use existing if found)
 * 3. Create prices for each Terraria plan
 * 4. Update the database with Stripe product and price IDs
 * 
 * Usage:
 *   node api/scripts/restore-terraria-product.js
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Database configuration
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
  port: process.env.MYSQL_PORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQL_USER || process.env.DB_USER || 'app_rw',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'app_core'
};

// Get decrypted Stripe secret from database
async function getDecryptedSecret(scope, keyName, aesKey) {
  const pool = mysql.createPool(DB_CONFIG);
  try {
    const [rows] = await pool.execute(
      `SELECT AES_DECRYPT(value_enc, ?) as decrypted_value 
       FROM secrets 
       WHERE scope = ? AND key_name = ?`,
      [aesKey, scope, keyName]
    );
    
    if (!rows || rows.length === 0 || !rows[0].decrypted_value) {
      await pool.end();
      return null;
    }

    const decrypted = rows[0].decrypted_value.toString('utf8');
    await pool.end();
    return decrypted;
  } catch (error) {
    await pool.end();
    console.error('Error decrypting secret:', error);
    return null;
  }
}

async function main() {
  console.log('🎮 Restore Terraria Product in Stripe');
  console.log('====================================\n');

  // Get Stripe secret key
  const aesKey = process.env.AES_KEY;
  if (!aesKey) {
    console.error('❌ Error: AES_KEY not found in environment');
    console.error('   Set it in api/.env or as environment variable');
    process.exit(1);
  }

  let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  // Try to get from database if not in env
  if (!stripeSecretKey) {
    console.log('🔑 Retrieving Stripe secret key from database...');
    stripeSecretKey = await getDecryptedSecret('stripe', 'STRIPE_SECRET_KEY', aesKey);
    if (!stripeSecretKey) {
      console.error('❌ Error: STRIPE_SECRET_KEY not found');
      console.error('   Set it in api/.env or ensure it exists in database secrets table');
      process.exit(1);
    }
    console.log('✅ Stripe secret key retrieved\n');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
  });

  // Connect to database
  const pool = mysql.createPool(DB_CONFIG);

  try {
    // Get all Terraria plans from database
    console.log('📋 Fetching Terraria plans from database...');
    let [plans] = await pool.execute(`
      SELECT id, display_name, game, ram_gb, vcores, ssd_gb, price_monthly, 
             stripe_price_id, stripe_product_id
      FROM plans
      WHERE game = 'terraria' AND is_active = 1
      ORDER BY ram_gb
    `);

    // If no plans exist, create them
    if (plans.length === 0) {
      console.log('⚠️  No Terraria plans found in database. Creating default plans...\n');
      
      const defaultPlans = [
        { id: 'terraria-1gb', ram_gb: 1, vcores: 1, ssd_gb: 10, price: 2.99, name: 'Terraria 1GB' },
        { id: 'terraria-2gb', ram_gb: 2, vcores: 1, ssd_gb: 20, price: 4.99, name: 'Terraria 2GB' },
        { id: 'terraria-4gb', ram_gb: 4, vcores: 2, ssd_gb: 40, price: 9.99, name: 'Terraria 4GB' }
      ];

      for (const planData of defaultPlans) {
        try {
          await pool.execute(`
            INSERT INTO plans (id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly, display_name, is_active)
            VALUES (?, 'game', 'terraria', ?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
              ram_gb = VALUES(ram_gb),
              vcores = VALUES(vcores),
              ssd_gb = VALUES(ssd_gb),
              price_monthly = VALUES(price_monthly),
              display_name = VALUES(display_name)
          `, [
            planData.id,
            planData.ram_gb,
            planData.vcores,
            planData.ssd_gb,
            planData.price,
            planData.name
          ]);
          console.log(`   ✅ Created plan: ${planData.name} ($${planData.price}/mo)`);
        } catch (error) {
          console.error(`   ❌ Failed to create plan ${planData.name}:`, error.message);
        }
      }

      // Fetch the plans we just created
      [plans] = await pool.execute(`
        SELECT id, display_name, game, ram_gb, vcores, ssd_gb, price_monthly, 
               stripe_price_id, stripe_product_id
        FROM plans
        WHERE game = 'terraria' AND is_active = 1
        ORDER BY ram_gb
      `);
      console.log('');
    }

    console.log(`✅ Found ${plans.length} Terraria plan(s):`);
    plans.forEach(plan => {
      console.log(`   - ${plan.display_name} (${plan.ram_gb}GB): $${plan.price_monthly}/mo`);
    });
    console.log('');

    // Check if product already exists
    let productId = null;
    const existingProductId = plans.find(p => p.stripe_product_id && !p.stripe_product_id.startsWith('prod_XXX'))?.stripe_product_id;
    
    if (existingProductId) {
      try {
        const existingProduct = await stripe.products.retrieve(existingProductId);
        if (existingProduct && !existingProduct.deleted) {
          productId = existingProductId;
          console.log(`✅ Found existing product: ${productId} (${existingProduct.name})`);
        }
      } catch (error) {
        console.log(`⚠️  Existing product ${existingProductId} not found, will create new one`);
      }
    }

    // Create product if needed
    if (!productId) {
      console.log('📦 Creating new Terraria product in Stripe...');
      const product = await stripe.products.create({
        name: 'Terraria Server',
        description: 'Terraria game server hosting with mod support',
        metadata: {
          game: 'terraria',
          type: 'game_server'
        }
      });
      productId = product.id;
      console.log(`✅ Created product: ${productId}\n`);
    }

    // Create/update prices for each plan
    console.log('💳 Creating/updating prices...\n');
    let pricesCreated = 0;
    let pricesUpdated = 0;
    let errors = 0;

    for (const plan of plans) {
      try {
        const priceCents = Math.round(plan.price_monthly * 100);
        
        // Check if price already exists
        if (plan.stripe_price_id && !plan.stripe_price_id.startsWith('price_XXX')) {
          try {
            const existingPrice = await stripe.prices.retrieve(plan.stripe_price_id);
            if (existingPrice && existingPrice.product === productId) {
              console.log(`   ✓ Price exists for ${plan.display_name}: ${plan.stripe_price_id}`);
              pricesUpdated++;
              continue;
            }
          } catch (error) {
            console.log(`   ⚠ Price ${plan.stripe_price_id} not found, creating new one...`);
          }
        }

        // Create new price
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: priceCents,
          currency: 'usd',
          recurring: {
            interval: 'month'
          },
          metadata: {
            plan_id: plan.id,
            game: 'terraria',
            ram_gb: String(plan.ram_gb)
          }
        });

        // Update database
        await pool.execute(
          `UPDATE plans 
           SET stripe_price_id = ?, stripe_product_id = ?
           WHERE id = ?`,
          [price.id, productId, plan.id]
        );

        console.log(`   ✅ Created price for ${plan.display_name}: ${price.id} ($${plan.price_monthly}/mo)`);
        pricesCreated++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`   ❌ Failed to create price for ${plan.display_name}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Product ID: ${productId}`);
    console.log(`   💳 Prices created: ${pricesCreated}`);
    console.log(`   ↻ Prices already exist: ${pricesUpdated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Verify final state
    const [final] = await pool.execute(`
      SELECT id, display_name, stripe_price_id, stripe_product_id
      FROM plans
      WHERE game = 'terraria' AND is_active = 1
      ORDER BY ram_gb
    `);

    console.log('\n📋 Final Terraria Plans:');
    final.forEach(plan => {
      const status = plan.stripe_price_id ? '✅' : '❌';
      console.log(`   ${status} ${plan.display_name}: ${plan.stripe_price_id || 'MISSING'}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Check your STRIPE_SECRET_KEY is correct');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


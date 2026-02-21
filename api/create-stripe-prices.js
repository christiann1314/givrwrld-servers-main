#!/usr/bin/env node
// Create Stripe Products and Prices using Stripe API
// Uses API keys from database instead of CLI

import mysql from 'mysql2/promise';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const AES_KEY = process.env.AES_KEY || fs.readFileSync(path.join(projectRoot, 'AES_KEY.txt'), 'utf8').trim();
const passwordsFile = fs.readFileSync(path.join(projectRoot, 'PASSWORDS.txt'), 'utf8');
const dbPassword = passwordsFile.match(/app_rw:(.+)/)?.[1]?.trim();

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'app_rw',
  password: process.env.MYSQL_PASSWORD || dbPassword,
  database: process.env.MYSQL_DATABASE || 'app_core'
};

// Decrypt secret from database (using same method as api/utils/mysql.js)
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

    // Convert Buffer to string
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
  console.log('💳 Creating Stripe Products and Prices via API');
  console.log('===============================================\n');

  // Get Stripe secret key
  console.log('🔑 Retrieving Stripe secret key from database...');
  const stripeSecretKey = await getDecryptedSecret('stripe', 'STRIPE_SECRET_KEY', AES_KEY);
  if (!stripeSecretKey) {
    console.error('❌ Could not retrieve Stripe secret key from database');
    console.error('   Make sure AES_KEY is set and secrets table has encrypted STRIPE_SECRET_KEY');
    process.exit(1);
  }
  console.log('✅ Stripe secret key retrieved\n');

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  // Connect to database
  const pool = mysql.createPool(DB_CONFIG);

  try {
    // Get all plans without Stripe prices
    const [plans] = await pool.execute(`
      SELECT id, display_name, game, ram_gb, price_monthly, stripe_price_id, stripe_product_id
      FROM plans
      WHERE is_active = 1
      AND (stripe_price_id IS NULL OR stripe_price_id = '')
      ORDER BY game, display_name
    `);

    console.log(`📋 Found ${plans.length} plans needing Stripe prices\n`);

    // Group plans by game to create products
    const games = {};
    for (const plan of plans) {
      if (!games[plan.game]) {
        games[plan.game] = [];
      }
      games[plan.game].push(plan);
    }

    console.log(`📦 Creating products for ${Object.keys(games).length} games...\n`);

    const productMap = {};
    let productsCreated = 0;
    let pricesCreated = 0;
    let pricesUpdated = 0;
    let errors = 0;

    // Create products
    for (const [game, gamePlans] of Object.entries(games)) {
      const gameDisplay = game.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      try {
        // Check if product already exists (and is valid, not placeholder)
        const [existing] = await pool.execute(
          `SELECT stripe_product_id FROM plans WHERE game = ? AND stripe_product_id IS NOT NULL AND stripe_product_id != '' AND stripe_product_id NOT LIKE 'prod_XXX%' LIMIT 1`,
          [game]
        );

        let productId;
        if (existing.length > 0 && existing[0].stripe_product_id && !existing[0].stripe_product_id.startsWith('prod_XXX')) {
          productId = existing[0].stripe_product_id;
          console.log(`   ↻ Using existing product for ${gameDisplay}: ${productId}`);
        } else {
          // Create new product
          const product = await stripe.products.create({
            name: `${gameDisplay} Server`,
            description: `${gameDisplay} game server hosting`,
            metadata: { game }
          });
          productId = product.id;
          productMap[game] = productId;
          productsCreated++;
          console.log(`   ✅ Created product for ${gameDisplay}: ${productId}`);
        }

        // Create prices for each plan
        for (const plan of gamePlans) {
          try {
            const priceCents = Math.round(plan.price_monthly * 100);
            
            const price = await stripe.prices.create({
              product: productId,
              unit_amount: priceCents,
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: {
                plan_id: plan.id,
                game: plan.game,
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

            console.log(`      ✅ Created price for ${plan.display_name}: ${price.id} (\$${plan.price_monthly}/mo)`);
            pricesCreated++;

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`      ❌ Failed to create price for ${plan.display_name}:`, error.message);
            errors++;
          }
        }
      } catch (error) {
        console.error(`   ❌ Failed to create product for ${gameDisplay}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Complete!');
    console.log('============');
    console.log(`   Products created: ${productsCreated}`);
    console.log(`   Prices created: ${pricesCreated}`);
    console.log(`   Errors: ${errors}`);

    // Final verification
    const [final] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN stripe_price_id IS NOT NULL AND stripe_price_id != '' THEN 1 END) as with_stripe
      FROM plans
      WHERE is_active = 1
    `);

    console.log(`\n📊 Final Status:`);
    console.log(`   Total plans: ${final[0].total}`);
    console.log(`   With Stripe prices: ${final[0].with_stripe}`);
    console.log(`   Without Stripe prices: ${final[0].total - final[0].with_stripe}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);


#!/usr/bin/env node
/**
 * Delete Stripe Products Created Before November 10th
 * 
 * This script will:
 * 1. List all products in your Stripe account
 * 2. Filter products created before November 10, 2024
 * 3. Delete those products (with confirmation)
 * 
 * Usage:
 *   node api/scripts/delete-old-stripe-products.js
 * 
 * Environment:
 *   Requires STRIPE_SECRET_KEY in api/.env or as environment variable
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Configuration
const CUTOFF_DATE = new Date('2025-11-06T00:00:00Z'); // November 6, 2025 UTC - Delete Nov 5 and earlier, keep Nov 6+
const DRY_RUN = process.argv.includes('--dry-run');
const AUTO_YES = process.argv.includes('--yes') || process.argv.includes('-y');

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in environment');
  console.error('   Set it in api/.env or as environment variable');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

// Readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Format date for display
 */
function formatDate(date) {
  return new Date(date * 1000).toISOString().split('T')[0];
}

/**
 * List all products in Stripe
 */
async function listAllProducts() {
  const products = [];
  let hasMore = true;
  let startingAfter = null;

  console.log('📦 Fetching all products from Stripe...\n');

  while (hasMore) {
    const params = { limit: 100 };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const response = await stripe.products.list(params);
    products.push(...response.data);
    
    hasMore = response.has_more;
    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  return products;
}

/**
 * Filter products created before cutoff date
 */
function filterOldProducts(products) {
  return products.filter(product => {
    const createdDate = new Date(product.created * 1000);
    return createdDate < CUTOFF_DATE;
  });
}

/**
 * Delete a product and its associated prices
 */
async function deleteProduct(productId) {
  try {
    // First, list all prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      limit: 100
    });

    // Delete all prices first (not just archive - Stripe requires deletion for user-created prices)
    for (const price of prices.data) {
      try {
        // Try to delete the price (Stripe may prevent this if price is in use)
        await stripe.prices.del(price.id);
        console.log(`   ✓ Deleted price: ${price.id}`);
      } catch (error) {
        // If deletion fails, try archiving as fallback
        if (error.code === 'resource_in_use' || error.message.includes('in use')) {
          console.log(`   ⚠ Price ${price.id} is in use, archiving instead...`);
          try {
            await stripe.prices.update(price.id, { active: false });
            console.log(`   ✓ Archived price: ${price.id}`);
          } catch (archiveError) {
            console.error(`   ✗ Failed to archive price ${price.id}:`, archiveError.message);
          }
        } else {
          console.error(`   ✗ Failed to delete price ${price.id}:`, error.message);
        }
      }
    }

    // Wait a moment for Stripe to process price deletions
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete the product
    await stripe.products.del(productId);
    return true;
  } catch (error) {
    console.error(`   ✗ Failed to delete product ${productId}:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🗑️  Stripe Product Cleanup Script');
  console.log('================================\n');
  console.log(`Cutoff Date: ${CUTOFF_DATE.toISOString().split('T')[0]}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE (products will be deleted)'}\n`);

  try {
    // List all products
    const allProducts = await listAllProducts();
    console.log(`✅ Found ${allProducts.length} total products\n`);

    // Filter old products
    const oldProducts = filterOldProducts(allProducts);
    console.log(`📅 Found ${oldProducts.length} products created before ${CUTOFF_DATE.toISOString().split('T')[0]}\n`);

    if (oldProducts.length === 0) {
      console.log('✅ No products to delete!');
      rl.close();
      return;
    }

    // Display products to be deleted
    console.log('Products to be deleted:');
    console.log('─'.repeat(80));
    oldProducts.forEach((product, index) => {
      const createdDate = formatDate(product.created);
      const priceCount = product.metadata?.price_count || 'unknown';
      console.log(`${index + 1}. ${product.name} (${product.id})`);
      console.log(`   Created: ${createdDate}`);
      console.log(`   Active: ${product.active ? 'Yes' : 'No'}`);
      if (product.description) {
        console.log(`   Description: ${product.description.substring(0, 60)}...`);
      }
      console.log('');
    });
    console.log('─'.repeat(80));

    // Confirmation
    if (DRY_RUN) {
      console.log('🔍 DRY RUN: No products will be deleted.');
      console.log('   Run without --dry-run to actually delete products.\n');
      rl.close();
      return;
    }

    if (!AUTO_YES) {
      const answer = await question(`⚠️  Are you sure you want to delete ${oldProducts.length} product(s)? (yes/no): `);
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled. No products deleted.');
        rl.close();
        return;
      }
    } else {
      console.log(`⚠️  Auto-confirming deletion of ${oldProducts.length} product(s)...\n`);
    }

    // Delete products
    console.log('\n🗑️  Deleting products...\n');
    let successCount = 0;
    let failCount = 0;

    for (const product of oldProducts) {
      console.log(`Deleting: ${product.name} (${product.id})...`);
      const success = await deleteProduct(product.id);
      if (success) {
        successCount++;
        console.log(`✅ Deleted: ${product.name}\n`);
      } else {
        failCount++;
        console.log(`❌ Failed: ${product.name}\n`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully deleted: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total processed: ${oldProducts.length}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Check your STRIPE_SECRET_KEY is correct');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


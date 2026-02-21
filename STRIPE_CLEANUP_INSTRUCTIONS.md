# Stripe Product Cleanup - Remove Products Created on Nov 5 or Earlier

## Overview

This script will delete all Stripe products created on November 5, 2025 or earlier. Products created on November 6, 2025 or later (including November 10) will be kept.

## Prerequisites

1. **Stripe Secret Key** must be set in `api/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_...your-key
   ```

2. **Node.js** installed and dependencies installed:
   ```bash
   cd api
   npm install
   ```

## Usage

### Step 1: Dry Run (Recommended First)

Run in dry-run mode to see what will be deleted without making changes:

```bash
cd api
npm run stripe:delete-old:dry-run
```

This will:
- List all products in your Stripe account
- Show which ones were created on November 5, 2025 or earlier
- Display details about each product
- **NOT delete anything**

### Step 2: Review the Output

Check the list of products that will be deleted. Make sure these are the ones you want to remove.

### Step 3: Actually Delete (When Ready)

Once you've confirmed the list is correct, run the actual deletion:

```bash
cd api
npm run stripe:delete-old
```

This will:
- Show the same list of products
- Ask for confirmation (type "yes" to proceed)
- Delete each product and archive its associated prices
- Show a summary of what was deleted

## What Gets Deleted

- **Products** created on November 5, 2025 or earlier
- **Associated prices** for those products (archived, not deleted)
- **Product metadata** and descriptions

## What Does NOT Get Deleted

- Products created on November 6, 2025 or later (including November 10)
- Active subscriptions using those products (Stripe will prevent deletion if products are in use)
- Customer records
- Payment history

## Safety Features

1. **Dry-run mode** - Test first without making changes
2. **Confirmation prompt** - Must type "yes" to proceed
3. **Error handling** - Continues if individual products fail
4. **Rate limiting** - Small delays between deletions to avoid API limits

## Troubleshooting

### "STRIPE_SECRET_KEY not found"

Make sure you have `api/.env` file with:
```env
STRIPE_SECRET_KEY=sk_live_...your-key
```

### "Cannot delete product - it is currently in use"

If a product is being used by an active subscription, Stripe will prevent deletion. You'll need to:
1. Cancel or complete the subscription first
2. Then delete the product

### "Rate limit exceeded"

The script includes delays, but if you have many products, you might hit rate limits. Wait a few minutes and run again.

## Manual Alternative

If you prefer to delete products manually:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Filter products by creation date
3. Delete products one by one
4. Archive associated prices

## Notes

- **Backup**: Consider exporting your product data before deletion
- **Subscriptions**: Products with active subscriptions cannot be deleted
- **Prices**: Prices are archived (set to inactive) before product deletion
- **Irreversible**: Deleted products cannot be recovered

## Example Output

```
🗑️  Stripe Product Cleanup Script
================================

Cutoff Date: 2025-11-06 (deletes Nov 5 and earlier, keeps Nov 6+)
Mode: LIVE (products will be deleted)

📦 Fetching all products from Stripe...

✅ Found 25 total products

📅 Found 8 products created on or before 2025-11-05

Products to be deleted:
────────────────────────────────────────────────────────────────────────────────
1. Minecraft Server - 4GB (prod_abc123)
   Created: 2024-10-15
   Active: Yes
   Description: Minecraft server with 4GB RAM...

2. Palworld Server - 8GB (prod_def456)
   Created: 2024-09-20
   Active: Yes
   Description: Palworld server with 8GB RAM...

...

⚠️  Are you sure you want to delete 8 product(s)? (yes/no): yes

🗑️  Deleting products...

Deleting: Minecraft Server - 4GB (prod_abc123)...
   ✓ Archived price: price_xyz789
✅ Deleted: Minecraft Server - 4GB

...

================================================================================
📊 Summary:
   ✅ Successfully deleted: 8
   ❌ Failed: 0
   📦 Total processed: 8
================================================================================
```


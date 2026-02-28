#!/usr/bin/env node

/**
 * Prewarm PayPal plans for all active (plan_id, term) combinations.
 *
 * For each active plan and supported term, this calls ensurePayPalPlan(plan, term)
 * so that paypal_plan_terms contains the required PayPal plan IDs ahead of time.
 *
 * Run from api/:
 *   node scripts/paypal-prewarm.mjs
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getAllPlans } from '../utils/mysql.js';
import {
  ensurePayPalPlan,
  getBillingTermSpec,
} from '../services/paypalPlans.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from api/.env (and optionally root .env if present).
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPPORTED_TERMS = ['monthly', 'quarterly', 'semiannual', 'yearly'];

async function main() {
  console.log('[paypal-prewarm] Starting prewarm...');
  const plans = await getAllPlans();
  console.log(`[paypal-prewarm] Found ${plans.length} active plans.`);

  for (const plan of plans) {
    for (const rawTerm of SUPPORTED_TERMS) {
      const spec = getBillingTermSpec(rawTerm);
      try {
        const paypalPlanId = await ensurePayPalPlan(plan, spec.term);
        console.log(
          `[OK] plan=${plan.id} term=${spec.term} paypal_plan_id=${paypalPlanId}`,
        );
      } catch (err) {
        // Plans may not support all terms; log and continue.
        console.log(
          `[SKIP] plan=${plan.id} term=${spec.term} reason=${err?.message || err}`,
        );
      }
    }
  }

  console.log('[paypal-prewarm] Done.');
}

main().catch((err) => {
  console.error('[paypal-prewarm] FAILED:', err);
  process.exit(1);
});


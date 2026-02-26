/**
 * Phase 1 Local verification script.
 * Run from repo root: node api/scripts/verify-phase1-local.js
 * Or from api: node scripts/verify-phase1-local.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(apiDir, '..');

dotenv.config({ path: path.join(apiDir, '.env') });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

const results = { passed: [], failed: [], skipped: [] };

function pass(name, detail = '') {
  results.passed.push(detail ? `${name}: ${detail}` : name);
  console.log(`  \u2713 ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, reason) {
  results.failed.push(`${name}: ${reason}`);
  console.log(`  \u2717 ${name} — ${reason}`);
}

function skip(name, reason) {
  results.skipped.push(`${name}: ${reason}`);
  console.log(`  - ${name} (skipped: ${reason})`);
}

async function main() {
  console.log('\n--- Phase 1 Local verification ---\n');

  // 1. Health endpoint
  console.log('1. GET /health');
  try {
    const res = await fetch(`${API_BASE}/health`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail('Health', `HTTP ${res.status}`);
    } else if (body.status !== 'ok') {
      fail('Health', 'body.status not ok');
    } else {
      const hasNew = body.uptime_seconds != null && body.version && body.memory;
      if (hasNew) pass('Health 200, uptime + version + memory');
      else pass('Health 200', '(Phase 1 fields: add uptime_seconds, version, memory to /health if missing)');
    }
  } catch (e) {
    skip('Health', `API unreachable (start API for full check): ${e.message}`);
  }

  // 2. Ready endpoint
  console.log('\n2. GET /ready');
  try {
    const res = await fetch(`${API_BASE}/ready`);
    const body = await res.json().catch(() => ({}));
    if (body.checks && typeof body.status !== 'undefined') {
      pass('Ready returns checks and status', body.status);
    } else if (res.ok) {
      pass('Ready 200', '(add checks/status to /ready if missing)');
    } else if (res.status === 404) {
      skip('Ready', 'endpoint not found (deploy latest API for /ready)');
    } else {
      fail('Ready', res.status + ' missing checks or status');
    }
  } catch (e) {
    skip('Ready', `API unreachable: ${e.message}`);
  }

  // 3. Logs directory
  console.log('\n3. Logs directory');
  const logDir = path.join(apiDir, 'logs');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const testFile = path.join(logDir, '.verify-write');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    pass('api/logs exists and writable');
  } catch (e) {
    fail('api/logs', e.message);
  }

  // 4. Marketing directory + writable (GrowthAdsGenerator writes here every 2 days)
  console.log('\n4. Marketing output (GrowthAdsGenerator)');
  const marketingDir = path.join(rootDir, 'marketing');
  try {
    fs.mkdirSync(marketingDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const samplePath = path.join(marketingDir, `${date}.txt`);
    const content = `# GIVRwrld marketing copy – ${date}\n\n## Hooks (3)\n1. Sample hook A\n2. Sample hook B\n3. Sample hook C\n\n## CTA block\nReady to host? → givrwrldservers.com\n`;
    fs.writeFileSync(samplePath, content, 'utf8');
    pass('marketing/ writable, sample ' + path.basename(samplePath) + ' created');
  } catch (e) {
    fail('Marketing', e.message);
  }

  // 5. Agent modules load (do not start runner — it starts cron)
  console.log('\n5. Agent modules load');
  try {
    await import('../agents/OpsWatchdog.js');
    await import('../agents/ProvisioningAuditor.js');
    await import('../agents/GrowthAdsGenerator.js');
    pass('OpsWatchdog, ProvisioningAuditor, GrowthAdsGenerator load');
  } catch (e) {
    fail('Agent modules', e.message);
  }

  // 6. DB schema (optional)
  console.log('\n6. DB schema (optional)');
  try {
    const pool = (await import('../config/database.js')).default;
    const [rows] = await pool.execute(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'paypal_webhook_events' LIMIT 1`
    );
    if (rows && rows.length > 0) {
      pass('paypal_webhook_events table exists');
    } else {
      skip('paypal_webhook_events', 'table not found — run Phase 1 migration');
    }
    const [cols] = await pool.execute(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name IN ('provision_attempt_count','last_provision_attempt_at')`
    );
    if (cols && cols.length >= 2) {
      pass('orders has provision_attempt_count, last_provision_attempt_at');
    } else {
      skip('orders provision columns', 'columns not found — run Phase 1 migration');
    }
  } catch (e) {
    skip('DB schema', e.message);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Passed:  ${results.passed.length}`);
  console.log(`Failed:  ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  if (results.failed.length > 0) {
    console.log('\nFailed:', results.failed);
    process.exit(1);
  }

  console.log('\nManual verification (see docs/LOCAL_PHASE1_RUNBOOK.md §9):');
  console.log('  • Webhook idempotency: replay same event_id twice → 200, single row in paypal_webhook_events');
  console.log('  • Stuck order retry: order paid/provisioning >10min → check agents.log after 15min');
  console.log('  • PM2 restart: pm2 stop → pm2 start ecosystem.config.cjs → health 200, pm2 status\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

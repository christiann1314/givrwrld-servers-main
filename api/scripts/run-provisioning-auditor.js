#!/usr/bin/env node
/**
 * Run ProvisioningAuditor once (manual run).
 * From repo root: node api/scripts/run-provisioning-auditor.js
 * From api/: node scripts/run-provisioning-auditor.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(apiRoot, '.env') });

const log = (level, event, details) => {
  console.log(JSON.stringify({ level, event, ...(details || {}) }));
};

const runId = `manual_${Date.now()}`;
const { run } = await import('../dist/agents/ProvisioningAuditor.js');
await run(runId, log);
console.log('ProvisioningAuditor run complete.');
process.exit(0);

/**
 * Run ProvisioningAuditor once. From api/: npx tsx scripts/run-provisioning-auditor.ts
 */
import 'dotenv/config';
import { run } from '../agents/ProvisioningAuditor.js';

const log = (level: string, event: string, details?: Record<string, unknown>) => {
  console.log(JSON.stringify({ level, event, ...details }));
};

const runId = `manual_${Date.now()}`;
run(runId, log)
  .then(() => {
    console.log('ProvisioningAuditor run complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

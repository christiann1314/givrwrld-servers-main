/**
 * Phase 1 VPS Agents entry: OpsWatchdog (60s), ProvisioningAuditor (5 min), DailyKPIDigest (9 AM local).
 * Run from api/: node dist/agents/index.js (after npm run agents:build).
 */
import dotenv from 'dotenv';
dotenv.config();

import { createServiceLogger } from '../lib/sharedLogger.js';
import { run as runOpsWatchdog } from './OpsWatchdog.js';
import { run as runProvisioningAuditor } from './ProvisioningAuditor.js';
import { run as runDailyKPIDigest } from './DailyKPIDigest.js';

const log = createServiceLogger('agents');

function runId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function wrap(name: string, fn: (runId: string, log: (level: 'info'|'warn'|'error', event: string, details?: Record<string, unknown>) => void) => Promise<void>) {
  return async () => {
    const id = runId();
    const runLog = createServiceLogger('agents', { run_id: id });
    const agentLog = (level: 'info' | 'warn' | 'error', event: string, details?: Record<string, unknown>) => {
      const d = { ...details, agent: name };
      if (level === 'info') runLog.info(event, d);
      else if (level === 'warn') runLog.warn(event, d);
      else runLog.error(event, d);
    };
    try {
      await fn(id, agentLog);
    } catch (e: unknown) {
      agentLog('error', `${name}_error`, { error: e instanceof Error ? e.message : String(e) });
    }
  };
}

function start(): void {
  log.info('agents_start', { event: 'startup' });

  // OpsWatchdog: every 60 seconds
  setInterval(wrap('OpsWatchdog', runOpsWatchdog), 60 * 1000);
  void wrap('OpsWatchdog', runOpsWatchdog)();

  // ProvisioningAuditor: every 5 minutes
  setInterval(wrap('ProvisioningAuditor', runProvisioningAuditor), 5 * 60 * 1000);
  void wrap('ProvisioningAuditor', runProvisioningAuditor)();

  // DailyKPIDigest: 9:00 AM local every day (cron 0 9 * * *)
  function schedule9AM(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    setTimeout(() => {
      void wrap('DailyKPIDigest', runDailyKPIDigest)();
      setInterval(() => void wrap('DailyKPIDigest', runDailyKPIDigest)(), 24 * 60 * 60 * 1000);
    }, ms);
  }
  schedule9AM();

  log.info('agents_scheduled', { event: 'scheduled', OpsWatchdog: '60s', ProvisioningAuditor: '5m', DailyKPIDigest: '9:00 AM daily' });
}

start();

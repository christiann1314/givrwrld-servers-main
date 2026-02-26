/**
 * Lightweight agent runner: scheduler + registration + structured logs to logs/agents.log
 * Run from api/: node agents/runner.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cron from 'node-cron';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const LOG_DIR = path.resolve(rootDir, 'logs');
const AGENTS_LOG = path.join(LOG_DIR, 'agents.log');

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.error('Could not create logs dir:', e.message);
  }
}

function agentLogger(agentName, level, data, msg) {
  ensureLogDir();
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    agent: agentName,
    ...data,
    msg: msg || undefined,
  }) + '\n';
  try {
    fs.appendFileSync(AGENTS_LOG, line);
  } catch (e) {
    console.error('Agent log write failed:', e.message);
  }
}

const registry = [];

function register(name, schedule, runFn) {
  registry.push({ name, schedule, run: runFn });
}

async function runAgent(agent) {
  const log = (level, data, msg) => agentLogger(agent.name, level, data, msg);
  try {
    log('info', { event: 'start' }, `${agent.name} run started`);
    await agent.run(log);
    log('info', { event: 'end' }, `${agent.name} run completed`);
  } catch (err) {
    log('error', { event: 'error', err: err?.message, stack: err?.stack }, `${agent.name} failed`);
  }
}

function start() {
  ensureLogDir();
  agentLogger('runner', 'info', { event: 'startup' }, 'Agent runner started');

  for (const agent of registry) {
    if (!cron.validate(agent.schedule)) {
      agentLogger('runner', 'error', { agent: agent.name, schedule: agent.schedule }, 'Invalid cron schedule');
      continue;
    }
    cron.schedule(agent.schedule, () => runAgent(agent));
    agentLogger('runner', 'info', { agent: agent.name, schedule: agent.schedule }, `Scheduled ${agent.name}`);
  }
}

// Load and register agents
const { registerOpsWatchdog } = await import('./OpsWatchdog.js');
const { registerProvisioningAuditor } = await import('./ProvisioningAuditor.js');
const { registerGrowthAdsGenerator } = await import('./GrowthAdsGenerator.js');

registerOpsWatchdog(register);
registerProvisioningAuditor(register);
registerGrowthAdsGenerator(register);

start();

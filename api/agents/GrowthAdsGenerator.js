/**
 * GrowthAdsGenerator: every 48 hours, generate 3 hooks, 2 short ad scripts, 1 CTA block.
 * Saves to marketing/YYYY-MM-DD.txt (relative to api/ or project root).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(rootDir, '..');
const MARKETING_DIR = path.resolve(projectRoot, 'marketing');

const HOOKS = [
  'Your players deserve a server that doesn\'t quit when you do. GIVRwrld keeps your game online, 24/7.',
  'One click. One plan. Your own Rust, Minecraft, or Palworld server—ready in minutes.',
  'Stop sharing someone else\'s server. Run your own. Premium game hosting, no DevOps required.',
];

const AD_SCRIPTS = [
  'Need a game server that just works? GIVRwrld spins up Rust, Minecraft, Palworld, and more in minutes. Pick your game, choose your plan, pay with PayPal. Your server, your rules. Try us at givrwrldservers.com.',
  'Tired of lag and random resets? Get a dedicated game server with GIVRwrld. US East, auto-provisioned, one dashboard. Monthly or yearly—you\'re in control. givrwrldservers.com',
];

const CTA_BLOCK = `Ready to host?
→ Choose your game and plan at givrwrldservers.com
→ Pay with PayPal. Server goes live in minutes.
→ Manage everything in one place. 24/7. No surprises.`;

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export function registerGrowthAdsGenerator(register) {
  register('GrowthAdsGenerator', '0 0 */2 * *', async (log) => {
    const date = new Date().toISOString().slice(0, 10);
    ensureDir(MARKETING_DIR);
    const outPath = path.join(MARKETING_DIR, `${date}.txt`);
    const lines = [
      `# GIVRwrld marketing copy – ${date}`,
      '',
      '## Hooks (3)',
      ...HOOKS.map((h, i) => `${i + 1}. ${h}`),
      '',
      '## Short ad scripts (2)',
      ...AD_SCRIPTS.map((s, i) => `### Ad ${i + 1}\n${s}`),
      '',
      '## CTA block',
      CTA_BLOCK,
      '',
    ];
    const content = lines.join('\n');
    fs.writeFileSync(outPath, content, 'utf8');
    log('info', { path: outPath, hooks: 3, ads: 2 }, 'GrowthAdsGenerator wrote marketing file');
  });
}

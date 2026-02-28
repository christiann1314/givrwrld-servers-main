// Content pillars + theme metadata for scheduled / educational content (no AI).
// Each theme is an object with:
// - key: stable identifier (used as theme_key in payload)
// - label: human-readable title
// - channels: array of channels this theme should target ('discord' | 'reddit' | 'tiktok')
// - discordMode: 'full' | 'teaser' | 'skip' (controls how strong the Discord post should be)
// - defaultAngle / exampleGame / proofPoint / cta: optional defaults for copy generation

export const contentPillars = {
  authority: [
    {
      key: 'infra_transparency',
      label: 'How we design our infra for weekend spikes',
      channels: ['discord', 'reddit', 'tiktok'],
      discordMode: 'full',
      defaultAngle: 'Walk through how we size nodes and monitor load so servers don\'t fall over on Friday night.',
      exampleGame: 'Minecraft',
      proofPoint: 'We routinely see stable TPS through 2–3x traffic spikes on shared nodes.',
      cta: 'Ask us for our node sizing checklist or share your own panel graphs.',
    },
    {
      key: 'hardware_breakdown',
      label: 'What actually matters in game server hardware',
      channels: ['discord', 'reddit'],
      discordMode: 'teaser',
      defaultAngle: 'Explain why single-core performance and NVMe matter more than raw core count for most Minecraft/Rust servers.',
      exampleGame: 'Rust',
      proofPoint: 'Moving noisy neighbors off cheaper CPUs cut lag spikes by ~30% on busy weekends.',
      cta: 'Share your own hardware stack or ask for our recommended baseline.',
    },
    {
      key: 'node_capacity',
      label: 'How we decide when to add a new node',
      channels: ['discord', 'reddit'],
      discordMode: 'full',
      defaultAngle: 'Explain the simple rules-of-thumb we use for knowing when a node is “full enough”.',
      exampleGame: 'Palworld',
      proofPoint: 'Keeping nodes under a specific CPU/RAM envelope keeps latency predictable as player slots fill.',
      cta: 'Ask us for the exact thresholds we watch and compare against your host.',
    },
    {
      key: 'stack_choices',
      label: 'Why we picked this stack (and what we’d change)',
      channels: ['reddit', 'tiktok'],
      discordMode: 'skip',
      defaultAngle: 'Talk through why we chose Pterodactyl + MariaDB + PM2 and where it bites us.',
      exampleGame: 'Generic multi-game stack',
      proofPoint: 'Having one battle-tested stack means we can ship changes quickly without surprise interactions.',
      cta: 'Tell us what your stack looks like and what you\'d change if you were starting over.',
    },
  ],
  education: [
    {
      key: 'server_sizing_guide',
      label: 'How to right-size a game server (without overpaying)',
      channels: ['discord', 'reddit'],
      discordMode: 'full',
      defaultAngle: 'Share simple RAM/CPU guidelines for small friend servers vs public communities.',
      exampleGame: 'Minecraft',
      proofPoint: 'Most small groups can start lower than they think as long as they watch a few key metrics.',
      cta: 'Drop your current server specs and we\'ll suggest a baseline.',
    },
    {
      key: 'mod_performance_tips',
      label: 'Mods that silently wreck performance (and how to tame them)',
      channels: ['discord', 'reddit', 'tiktok'],
      discordMode: 'teaser',
      defaultAngle: 'Explain how a few heavy mods/extensions can dominate CPU and what to watch for.',
      exampleGame: 'Modded Minecraft',
      proofPoint: 'We\'ve seen specific plugins cut tick performance in half until tuned or removed.',
      cta: 'Ask for our short checklist before you add the next “must have” plugin.',
    },
    {
      key: 'allocation_best_practices',
      label: 'Port and allocation best practices for multi-game nodes',
      channels: ['reddit'],
      discordMode: 'skip',
      defaultAngle: 'Lay out simple rules for allocations that stay understandable a year later.',
      exampleGame: 'Multi-game',
      proofPoint: 'Clean allocation plans make migrations and debugging much faster.',
      cta: 'Share a screenshot of your current panel and we\'ll point out a few quick wins.',
    },
    {
      key: 'backup_and_restore',
      label: 'Practical backup + restore for small hosts and hobbyists',
      channels: ['discord', 'reddit'],
      discordMode: 'full',
      defaultAngle: 'Make backups less abstract with concrete frequencies and restore drills.',
      exampleGame: 'Minecraft / Rust',
      proofPoint: 'We treat restores as a normal operation, not a panic move.',
      cta: 'Tell us how you back up today and we\'ll sanity check it.',
    },
  ],
  trust: [
    {
      key: 'incident_transparency',
      label: 'Why we publish short incident notes instead of pretending nothing broke',
      channels: ['reddit'],
      discordMode: 'skip',
    },
    {
      key: 'postmortems',
      label: 'What we include in a real postmortem',
      channels: ['reddit'],
      discordMode: 'skip',
    },
    {
      key: 'maintenance_windows',
      label: 'How we plan maintenance windows around real player behavior',
      channels: ['discord'],
      discordMode: 'teaser',
    },
    {
      key: 'uptime_and_alerts',
      label: 'The alerts that actually wake us up (and the ones we mute)',
      channels: ['discord', 'reddit'],
      discordMode: 'teaser',
    },
  ],
  growth: [
    {
      key: 'deploy_tutorial',
      label: 'From zero to live server in a few clicks',
      channels: ['discord', 'tiktok'],
      discordMode: 'teaser',
    },
    {
      key: 'community_case_study',
      label: 'How one community migrated without a weekend of downtime',
      channels: ['reddit', 'tiktok'],
      discordMode: 'skip',
    },
    {
      key: 'game_launch_walkthrough',
      label: 'What we do the week a new game launches',
      channels: ['discord', 'reddit'],
      discordMode: 'teaser',
    },
    {
      key: 'migration_from_another_host',
      label: 'Zero-drama migration checklist from another host',
      channels: ['discord', 'reddit'],
      discordMode: 'full',
    },
  ],
};

/** All pillar keys for rotation. */
export const pillarKeys = Object.keys(contentPillars);

/** Flatten all themes for scheduling (e.g. 2 educational + 1 infra per week). */
export function getAllThemes() {
  const out = [];
  for (const [pillar, themes] of Object.entries(contentPillars)) {
    for (const theme of themes) {
      out.push({ pillar, theme });
    }
  }
  return out;
}

/**
 * Growth-driven rotation: 2 education + 1 authority per week.
 * Deterministic by ISO week number so the same week always gets the same themes (idempotent).
 * @param {Date} [date=new Date()]
 * @returns {{ theme: string, pillar: string, themeMeta: any }[]}
 */
export function getWeeklyThemes(date = new Date()) {
  const education = contentPillars.education || [];
  const authority = contentPillars.authority || [];
  if (education.length === 0 && authority.length === 0) return [];

  const getISOWeek = (d) => {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 4 - (t.getDay() || 7));
    const yearStart = new Date(t.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return { year: t.getFullYear(), week: weekNo };
  };
  const { year, week } = getISOWeek(date);
  const seed = year * 53 + week;

  const out = [];
  if (education.length > 0) {
    const i0 = seed % education.length;
    const i1 = (seed + 1) % education.length;
    out.push({ theme: education[i0].label, pillar: 'education', themeMeta: education[i0] });
    if (education.length > 1) {
      out.push({ theme: education[i1].label, pillar: 'education', themeMeta: education[i1] });
    }
  }
  if (authority.length > 0) {
    const j = seed % authority.length;
    out.push({ theme: authority[j].label, pillar: 'authority', themeMeta: authority[j] });
  }
  return out;
}

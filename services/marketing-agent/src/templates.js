// Deterministic templates for marketing events.
// No AI – pure functions from event -> channel draft payloads.

function formatShortRegion(region) {
  if (!region) return 'US East';
  return region;
}

export function createDraftsForEvent(event) {
  const { event_type: type, payload_json: payloadRaw } = event;
  const payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw || {};

  switch (type) {
    case 'node_online':
      return createNodeOnlineDrafts(payload);
    case 'game_added':
      return createGameAddedDrafts(payload);
    case 'incident':
      return createIncidentDrafts(payload);
    case 'maintenance':
      return createMaintenanceDrafts(payload);
    case 'bug_fix':
      return createBugFixDrafts(payload);
    case 'campaign_ad':
      return createCampaignAdDrafts(payload);
    case 'scheduled_content':
      return createScheduledContentDrafts(payload);
    default:
      return [];
  }
}

function createNodeOnlineDrafts(payload) {
  const region = formatShortRegion(payload.region);
  const cpu = payload.cpu || 'Ryzen 7 9800X3D';
  const storage = payload.storage || 'NVMe SSD';

  const title = `New capacity online in ${region}`;

  const discord = {
    channel: 'discord',
    type: 'announcement',
    title,
    contentLines: [
      `We brought a new node online in ${region}.`,
      '',
      `• CPU: ${cpu}`,
      `• Storage: ${storage}`,
      '',
      'This adds headroom for new game servers without impacting existing worlds.',
    ],
  };

  const reddit = {
    channel: 'reddit',
    type: 'infra_update',
    title: `[Infra update] New node online in ${region}`,
    markdown: [
      `We just brought a new game server node online in **${region}**.`,
      '',
      `- CPU: **${cpu}**`,
      `- Storage: **${storage}**`,
      '',
      'Goal: more consistent performance for Minecraft, Rust, Palworld and friends when the weekend rush hits.',
      '',
      'Happy to share more details about the stack if you are also running your own panel or infra.',
    ].join('\n'),
  };

  const tiktok = {
    channel: 'tiktok',
    type: 'infra_update',
    hook: '“New node online – here’s why your server stops lagging on Friday night.”',
    scriptSteps: [
      'Shot 1: Dashboard screenshot showing multiple active servers.',
      'Shot 2: Overlay text: "New node online in ' + region + '" with CPU/RAM specs.',
      'Shot 3: Quick zoom on a specific game card (e.g. Minecraft / Rust).',
    ],
    caption: `New capacity online in ${region} – tuned for multi-game deployments.`,
    hashtags: ['#gamer', '#gameserver', '#minecraftserver', '#rustserver', '#hosting'],
    soraPrompt:
      '9:16 shot of glowing data center racks with emerald highlights and minimal UI overlays showing CPU and RAM bars increasing.',
  };

  return [discord, reddit, tiktok];
}

function createGameAddedDrafts(payload) {
  const game = payload.game || 'New game';
  const recommended = payload.recommended_plan || '';

  const title = `${game} now available for one-click deploy`;

  const discord = {
    channel: 'discord',
    type: 'announcement',
    title,
    contentLines: [
      `${game} is now available in the Deploy page.`,
      '',
      recommended ? `Recommended plan: ${recommended}.` : '',
      'Configure, checkout, and we handle panel + server provisioning.',
    ].filter(Boolean),
  };

  const reddit = {
    channel: 'reddit',
    type: 'feature',
    title: `${game} support added to our panel stack`,
    markdown: [
      `${game} support just landed on our Pterodactyl-based stack.`,
      '',
      recommended ? `We found that **${recommended}** is a good baseline for typical servers.` : '',
      '',
      'If you are running your own panel and curious how we tuned eggs / allocations for this, happy to share notes.',
    ].join('\n'),
  };

  const tiktok = {
    channel: 'tiktok',
    type: 'feature',
    hook: `"${game} in a few clicks – here's the deploy flow."`,
    scriptSteps: [
      'Shot 1: Start on GIVRwrld Deploy page, highlight the new game card.',
      'Shot 2: Walk through selecting a plan and region.',
      'Shot 3: Show the "Payment successful / provisioning" screen.',
    ],
    caption: `${game} is now available for one-click deployment on GIVRwrld.`,
    hashtags: ['#gameserver', `#${game.replace(/\s+/g, '')}`, '#hosting'],
    soraPrompt:
      '9:16 abstract fantasy UI with emerald highlights and a game world silhouette, suggesting a new realm going online.',
  };

  return [discord, reddit, tiktok];
}

function createIncidentDrafts(payload) {
  const summary = payload.summary || 'Service incident';
  const impact = payload.impact || '';
  const fix = payload.fix || '';
  const prevention = payload.prevention || '';

  const title = `Incident resolved: ${summary}`;

  const discord = {
    channel: 'discord',
    type: 'incident',
    title,
    contentLines: [
      summary,
      impact ? `Impact: ${impact}` : '',
      fix ? `Fix: ${fix}` : '',
      prevention ? `Prevention: ${prevention}` : '',
    ].filter(Boolean),
  };

  const reddit = {
    channel: 'reddit',
    type: 'incident_postmortem',
    title: `[Postmortem] ${summary}`,
    markdown: [
      `**Summary**: ${summary}`,
      '',
      impact ? `**Impact**: ${impact}` : '',
      fix ? `**Fix**: ${fix}` : '',
      prevention ? `**Prevention**: ${prevention}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };

  const tiktok = {
    channel: 'tiktok',
    type: 'incident_postmortem',
    hook: `"We broke provisioning for 12 minutes – here’s what failed and how we fixed it."`,
    scriptSteps: [
      'Shot 1: Status view or simple uptime graph with a small dip.',
      'Shot 2: Text overlay: "Provisioning delay ~12 minutes".',
      'Shot 3: Bullet list of root cause + fix + prevention.',
    ],
    caption: 'Short incident, quick fix, and a better alert in place for next time.',
    hashtags: ['#infra', '#postmortem', '#devops'],
    soraPrompt:
      '9:16 view of a control room wall of gauges where one briefly goes red then returns to green, with minimal text overlays.',
  };

  return [discord, reddit, tiktok];
}

function createMaintenanceDrafts(payload) {
  const window = payload.window || 'Scheduled maintenance window';

  const discord = {
    channel: 'discord',
    type: 'maintenance',
    title: 'Scheduled maintenance',
    contentLines: [
      window,
      '',
      'We will keep disruption as low as possible and post updates if timings change.',
    ],
  };

  return [discord];
}

function createBugFixDrafts(payload) {
  const summary = payload.summary || 'Bug fix deployed';
  const impact = payload.impact || '';

  const title = summary;

  const discord = {
    channel: 'discord',
    type: 'bug_fix',
    title,
    contentLines: [summary, impact ? `Impact: ${impact}` : ''].filter(Boolean),
  };

  return [discord];
}

function createCampaignAdDrafts(payload) {
  const game = payload.game || 'your favorite game';
  const offer = payload.offer || '10% off the first month';
  const plan = payload.plan || 'Starter plan';
  const expiresAt = payload.expires_at || '';

  const title = payload.title || `${game} servers – limited-time offer`;

  const discord = {
    channel: 'discord',
    type: 'ad',
    title,
    contentLines: [
      `Spin up a managed ${game} server in a few clicks.`,
      '',
      `• Offer: ${offer}`,
      `• Plan: ${plan}`,
      expiresAt ? `• Ends: ${expiresAt}` : '',
      '',
      'Deploy, invite friends, and we handle panel + infra.',
    ].filter(Boolean),
  };

  const reddit = {
    channel: 'reddit',
    type: 'ad',
    title: payload.reddit_title || `${game} server hosting – short launch offer`,
    markdown: [
      `We’ve been tuning our ${game} stack and are running a short launch offer for early users.`,
      '',
      `**Offer**: ${offer}`,
      `**Recommended plan**: ${plan}`,
      expiresAt ? `**Ends**: ${expiresAt}` : '',
      '',
      'We run on a Pterodactyl-based panel with opinionated defaults, alerting, and infra tuned for weekend spikes.',
      '',
      'Happy to answer questions about our setup, benchmarks, or how we handle migrations from other hosts.',
    ]
      .filter(Boolean)
      .join('\n'),
  };

  const tiktok = {
    channel: 'tiktok',
    type: 'ad',
    hook: payload.hook || `"Your ${game} server live in under 60 seconds."`,
    scriptSteps: payload.scriptSteps || [
      'Shot 1: Start on the GIVRwrld landing page, quick pan to the Deploy button.',
      `Shot 2: Select ${game}, pick the ${plan} plan, and choose a region.`,
      'Shot 3: Show the server online screen and friends joining.',
    ],
    caption:
      payload.caption ||
      `${game} servers in a few clicks – no panel wrestling, just play. ${offer}.`,
    hashtags:
      payload.hashtags || ['#gameserver', '#minecraftserver', '#rustserver', '#hosting', '#ad'],
    soraPrompt:
      payload.soraPrompt ||
      '9:16 vertical shot of a stylized game lobby filling with players while UI highlights a "Deploy server" button and a countdown timer, emerald accents.',
  };

  return [discord, reddit, tiktok];
}

function createScheduledContentDrafts(payload) {
  const themeKey = payload.theme_key || '';
  const theme = payload.theme || 'Infrastructure update';
  const pillar = payload.pillar || 'authority';
  const angle = payload.angle || '';
  const exampleGame = payload.example_game || '';
  const proofPoint = payload.proof_point || '';
  const cta = payload.cta || '';
  const channels = Array.isArray(payload.channels) && payload.channels.length > 0
    ? payload.channels
    : ['discord', 'reddit', 'tiktok'];
  const discordMode = payload.discordMode || 'full';

  const title = payload.title || theme;

  const drafts = [];

  const baseLines = [
    theme,
    '',
    angle && `Angle: ${angle}`,
    proofPoint && `Proof: ${proofPoint}`,
    exampleGame && `Example game: ${exampleGame}`,
    '',
    cta || '',
  ].filter(Boolean);

  if (channels.includes('discord') && discordMode !== 'skip') {
    const discordLines =
      discordMode === 'teaser'
        ? [
            theme,
            '',
            angle && `Why this matters: ${angle}`,
            '',
            cta || 'Reply if you want us to share the full breakdown.',
          ].filter(Boolean)
        : baseLines;

    drafts.push({
      channel: 'discord',
      type: 'scheduled',
      title,
      contentLines: discordLines,
      meta: {
        ...(payload.meta || {}),
        theme_key: themeKey,
        pillar,
        discordMode,
      },
    });
  }

  if (channels.includes('reddit')) {
    const reddit = {
      channel: 'reddit',
      type: 'scheduled',
      title: payload.reddit_title || theme,
      markdown: [
        `**${theme}**`,
        '',
        angle && angle,
        proofPoint && `**Proof**: ${proofPoint}`,
        exampleGame && `**Example game**: ${exampleGame}`,
        '',
        cta || 'Happy to answer questions in the comments.',
      ]
        .filter(Boolean)
        .join('\n'),
      meta: {
        ...(payload.meta || {}),
        theme_key: themeKey,
        pillar,
      },
    };
    drafts.push(reddit);
  }

  if (channels.includes('tiktok')) {
    const tiktok = {
      channel: 'tiktok',
      type: 'scheduled',
      hook:
        payload.hook ||
        `"${theme} – here’s what we learned running real game servers."`,
      scriptSteps:
        payload.scriptSteps || [
          'Shot 1: Dashboard or terminal with clear, non-sensitive view.',
          `Shot 2: Overlay key point from theme: "${theme}".`,
          'Shot 3: CTA: follow for more server/hosting tips.',
        ],
      caption:
        payload.caption ||
        (exampleGame
          ? `${theme} (${exampleGame} servers)`
          : theme),
      hashtags:
        payload.hashtags || ['#gameserver', '#hosting', '#devops', '#server'],
      soraPrompt:
        payload.soraPrompt ||
        '9:16 vertical shot of a clean desk setup with a monitor showing abstract dashboard or code, emerald accent lighting, minimal text overlay suggesting a short tutorial.',
      meta: {
        ...(payload.meta || {}),
        theme_key: themeKey,
        pillar,
      },
    };
    drafts.push(tiktok);
  }

  return drafts;
}
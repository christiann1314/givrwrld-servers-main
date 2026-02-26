/**
 * Optional Discord webhook alerts with cooldown to prevent spam.
 * Set DISCORD_ALERT_WEBHOOK_URL in env. Same issue key => max 1 alert per COOLDOWN_MS.
 */
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const cooldown = new Map();

export function getWebhookUrl() {
  const url = process.env.DISCORD_ALERT_WEBHOOK_URL;
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

/**
 * Send a Discord webhook message if URL is configured. Rate-limited by issueKey.
 * @param {string} issueKey - e.g. 'ops:api-down', 'ops:db-down', 'provision:order-123'
 * @param {string} title - Short title
 * @param {string} body - Plain text body (concise)
 * @returns {Promise<boolean>} - true if sent, false if skipped (no webhook or cooldown)
 */
export async function sendAlert(issueKey, title, body) {
  const url = getWebhookUrl();
  if (!url) return false;

  const now = Date.now();
  const last = cooldown.get(issueKey);
  if (last != null && now - last < COOLDOWN_MS) return false;

  const content = `**[${title}]**\n${body}`.slice(0, 2000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      cooldown.set(issueKey, now);
      return true;
    }
  } catch (_) {}
  return false;
}

export default { getWebhookUrl, sendAlert };

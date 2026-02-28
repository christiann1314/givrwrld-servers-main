// Discord webhook sender for marketing content drafts.
// Uses DISCORD_MARKETING_WEBHOOK_URL. On success sets status = 'sent_to_discord' (not 'posted');
// only mark 'posted' when you manually confirm in the draft review flow.
import { pool } from './db.js';

function getWebhookUrl() {
  const url = process.env.DISCORD_MARKETING_WEBHOOK_URL;
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

function buildDiscordContent(draft) {
  const title = draft.title || '';
  const lines = Array.isArray(draft.contentLines) ? draft.contentLines : [];

  const header = title ? `**${title}**` : '';
  const body = lines.join('\n');

  const combined = [header, body].filter(Boolean).join('\n\n');

  // Discord hard limit is 2000 chars for content.
  return combined.slice(0, 2000);
}

export async function sendDiscordDraft(draft) {
  const url = getWebhookUrl();
  if (!url) {
    console.log('[marketing-agent] DISCORD_MARKETING_WEBHOOK_URL not set, skipping Discord send.');
    return false;
  }

  const content = buildDiscordContent(draft);
  if (!content) {
    console.log('[marketing-agent] Draft has no Discord content, skipping.', { id: draft.id });
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      console.warn(
        '[marketing-agent] Discord webhook responded with non-2xx status',
        res.status,
        res.statusText
      );
      return false;
    }

    if (draft.id) {
      try {
        await pool.execute(
          `UPDATE marketing_content_drafts
             SET status = 'sent_to_discord', posted_at = NOW()
           WHERE id = ?`,
          [draft.id]
        );
      } catch (err) {
        console.warn('[marketing-agent] Failed to update draft status after Discord send', err);
      }
    }

    return true;
  } catch (err) {
    console.warn('[marketing-agent] Failed to send Discord webhook', err);
    return false;
  }
}

export default { sendDiscordDraft };


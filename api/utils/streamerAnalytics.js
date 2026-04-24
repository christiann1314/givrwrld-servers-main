import pool from '../config/database.js';

export async function bumpAnalytics(userId, field) {
  const col =
    field === 'imports_completed'
      ? 'imports_completed'
      : field === 'clips_completed'
        ? 'clips_completed'
        : field === 'posts_published'
          ? 'posts_published'
          : field === 'assistant_turns'
            ? 'assistant_turns'
            : null;
  if (!col) return;
  await pool.query(
    `INSERT INTO streamer_analytics_daily (user_id, day, imports_completed, clips_completed, posts_published, assistant_turns)
     VALUES (?, UTC_DATE(), 0, 0, 0, 0)
     ON DUPLICATE KEY UPDATE ${col} = ${col} + 1`,
    [userId]
  );
}

export async function getAnalyticsSummary(userId) {
  const [[today]] = await pool.query(
    `SELECT imports_completed, clips_completed, posts_published, assistant_turns
     FROM streamer_analytics_daily WHERE user_id = ? AND day = UTC_DATE()`,
    [userId]
  );
  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(imports_completed),0) AS imports_all,
       COALESCE(SUM(clips_completed),0) AS clips_all,
       COALESCE(SUM(posts_published),0) AS posts_all,
       COALESCE(SUM(assistant_turns),0) AS assistant_all
     FROM streamer_analytics_daily WHERE user_id = ?`,
    [userId]
  );
  const [[live]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM streamer_streams WHERE user_id = ? AND status = 'ready') AS streams_ready,
       (SELECT COUNT(*) FROM streamer_clips WHERE user_id = ? AND status = 'ready') AS clips_ready,
       (SELECT COUNT(*) FROM streamer_scheduled_posts WHERE user_id = ? AND status = 'posted') AS posts_done`,
    [userId, userId, userId]
  );
  return {
    today: {
      imports_completed: Number(today?.imports_completed || 0),
      clips_completed: Number(today?.clips_completed || 0),
      posts_published: Number(today?.posts_published || 0),
      assistant_turns: Number(today?.assistant_turns || 0),
    },
    lifetimeRollups: {
      imports_completed: Number(totals?.imports_all || 0),
      clips_completed: Number(totals?.clips_all || 0),
      posts_published: Number(totals?.posts_all || 0),
      assistant_turns: Number(totals?.assistant_all || 0),
    },
    live: {
      streams_ready: Number(live?.streams_ready || 0),
      clips_ready: Number(live?.clips_ready || 0),
      posts_posted: Number(live?.posts_done || 0),
    },
  };
}

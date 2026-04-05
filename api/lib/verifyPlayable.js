/**
 * Rebuild a minimal plan object for log verification from a queue job payload.
 * @param {{ mustContain?: string[], successLogPatternSources?: string[] }} payload
 */
export function planFromJobPayload(payload) {
  const sources = Array.isArray(payload?.successLogPatternSources) ? payload.successLogPatternSources : [];
  const successLogPatterns = sources
    .map((s) => {
      try {
        return new RegExp(s, 'i');
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return {
    policy: {
      startup: {
        mustContain: payload?.mustContain || [],
        successLogPatterns,
      },
    },
  };
}

/**
 * Game-specific "running for real" check from console output (Wings logs), not just Panel state.
 *
 * @param {{
 *   gameKey: string,
 *   logs: string,
 *   plan: { policy: { startup?: { mustContain?: string[], successLogPatterns?: RegExp[] } } | null } | null,
 * }} input
 */
export function verifyPlayableFromLogs({ gameKey, logs, plan }) {
  const policy = plan?.policy;
  if (!policy?.startup) {
    return { ok: true, skipped: true };
  }

  const text = String(logs || '');
  const { mustContain = [], successLogPatterns = [] } = policy.startup;

  for (const frag of mustContain) {
    if (frag && !text.includes(frag)) {
      return { ok: false, reason: `missing_startup_fragment:${frag}`, gameKey };
    }
  }

  if (successLogPatterns.length > 0) {
    const missing = successLogPatterns.filter((re) => !re.test(text));
    if (missing.length > 0) {
      return { ok: false, reason: 'missing_success_log_patterns', gameKey };
    }
  }

  return { ok: true, gameKey };
}

import net from 'node:net';

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkTcpPort({ host, port, timeoutMs = 4000 }) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(Number(port), host);
  });
}

export async function checkHttps({ url, timeoutMs = 8000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual',
    });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForTcp({ host, port, attempts = 18, intervalMs = 5000 }) {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await checkTcpPort({ host, port });
    if (ok) return true;
    await wait(intervalMs);
  }
  return false;
}

/**
 * Try TCP connect against each host in order until one succeeds (or all fail).
 * Used when branded DNS (mc-xxxx.domain) is not wired yet but the game port is open on the node FQDN/IP.
 *
 * @param {{ hosts: string[], port: number, attemptsPerHost?: number, intervalMs?: number }} opts
 * @returns {Promise<{ ok: boolean, host?: string }>}
 */
export async function waitForTcpFirstReachable({
  hosts,
  port,
  attemptsPerHost = 6,
  intervalMs = 5000,
}) {
  const list = (hosts || []).map((h) => String(h || '').trim()).filter(Boolean);
  const uniq = [...new Set(list)];
  if (uniq.length === 0) return { ok: false };
  for (const host of uniq) {
    const ok = await waitForTcp({ host, port, attempts: attemptsPerHost, intervalMs });
    if (ok) return { ok: true, host };
  }
  return { ok: false };
}

export async function waitForHttps({ url, attempts = 18, intervalMs = 5000 }) {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await checkHttps({ url });
    if (ok) return true;
    await wait(intervalMs);
  }
  return false;
}

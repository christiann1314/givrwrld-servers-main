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

export async function waitForHttps({ url, attempts = 18, intervalMs = 5000 }) {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await checkHttps({ url });
    if (ok) return true;
    await wait(intervalMs);
  }
  return false;
}

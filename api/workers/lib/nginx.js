import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const NGINX_SITES_AVAILABLE =
  process.env.NGINX_SITES_AVAILABLE || '/etc/nginx/sites-available';
const NGINX_SITES_ENABLED = process.env.NGINX_SITES_ENABLED || '/etc/nginx/sites-enabled';

export function buildNginxSiteConfig({ hostname, upstreamHost, upstreamPort }) {
  return `
server {
    listen 80;
    listen [::]:80;
    server_name ${hostname};

    location / {
        proxy_pass http://${upstreamHost}:${upstreamPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 30;
        proxy_send_timeout 300;
    }
}
`.trim();
}

export async function writeNginxSite({ hostname, configText }) {
  await fs.mkdir(NGINX_SITES_AVAILABLE, { recursive: true });
  await fs.mkdir(NGINX_SITES_ENABLED, { recursive: true });
  const filePath = path.join(NGINX_SITES_AVAILABLE, `${hostname}.conf`);
  await fs.writeFile(filePath, `${configText}\n`, 'utf8');
  const enabledPath = path.join(NGINX_SITES_ENABLED, `${hostname}.conf`);
  try {
    await fs.lstat(enabledPath);
  } catch {
    await fs.symlink(filePath, enabledPath);
  }
  return { filePath, enabledPath, NGINX_SITES_AVAILABLE, NGINX_SITES_ENABLED };
}

export async function testNginxConfig() {
  await execFileAsync('nginx', ['-t']);
}

export async function reloadNginx() {
  await execFileAsync('systemctl', ['reload', 'nginx']);
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * @param {{ hostname: string, email: string }} input
 */
export async function obtainCertificateNginx({ hostname, email }) {
  const args = [
    '--nginx',
    '-d',
    hostname,
    '--non-interactive',
    '--agree-tos',
    '-m',
    email,
    '--redirect',
  ];
  await execFileAsync('certbot', args);
}

#!/usr/bin/env node

import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBullmqRedisConnection } from '../lib/bullmqRedis.js';
import { resolvePostProvisionPayload } from '../lib/resolvePostProvisionPayload.js';
import { getEggRuntimePolicy } from '../config/gameRuntimePolicy.js';
import { buildGameBrandHostname, buildCustomerDisplayAddress } from './lib/hostname.js';
import {
  getOrder,
  transitionProvisionedToConfiguring,
  transitionConfiguringToVerifying,
  transitionVerifyingToPlayable,
  updateGameReachabilityDisplay,
} from './lib/orders.js';
import { waitForTcp, waitForHttps } from './lib/health.js';
import { buildNginxSiteConfig, writeNginxSite, testNginxConfig, reloadNginx } from './lib/nginx.js';
import { obtainCertificateNginx } from './lib/certs.js';
import { getLogger } from './lib/logger.js';
import { QUEUE_NAME } from '../queue/provisioningQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const logger = getLogger();
const connection = getBullmqRedisConnection();
const LETSENCRYPT_EMAIL = process.env.LETSENCRYPT_EMAIL || 'ops@givrwrldservers.com';

async function processClassAb({ orderId, payload, order }) {
  const trafficClass = payload.trafficClass || 'A';
  const brandHost = buildGameBrandHostname({
    gameKey: payload.gameKey,
    orderId,
  });
  const port = payload.primaryPort;
  if (port == null || !Number.isFinite(Number(port))) {
    throw new Error('Missing primary game port for reachability check');
  }
  const display = buildCustomerDisplayAddress({
    trafficClass,
    hostname: brandHost,
    port,
  });

  await updateGameReachabilityDisplay(orderId, {
    hostname: brandHost,
    displayAddress: display,
  });

  if (!(await transitionConfiguringToVerifying(orderId))) {
    throw new Error('Could not move order to verifying (expected configuring)');
  }

  const policy = getEggRuntimePolicy(order.ptero_egg_id);
  const gameProto = policy?.network?.game?.protocol || 'tcp';

  if (gameProto === 'udp') {
    logger.info(
      { order_id: orderId, game_proto: 'udp' },
      'provisioning_worker_skip_tcp_probe_udp_game',
    );
  } else {
    const ok = await waitForTcp({
      host: brandHost,
      port: Number(port),
      attempts: Number(process.env.POST_PROVISION_TCP_ATTEMPTS || 18),
      intervalMs: Number(process.env.POST_PROVISION_TCP_INTERVAL_MS || 5000),
    });
    if (!ok) {
      throw new Error(`TCP health check failed for ${brandHost}:${port}`);
    }
  }

  if (!(await transitionVerifyingToPlayable(orderId))) {
    throw new Error('Could not move order to playable (expected verifying)');
  }
}

async function processClassC({ orderId, payload }) {
  const hostname = payload.hostname;
  const upstreamPort = payload.httpsProxyRegistration?.upstreamPort;
  if (!hostname) {
    throw new Error('Missing HTTPS proxy hostname (Class C)');
  }
  if (upstreamPort == null || !Number.isFinite(Number(upstreamPort))) {
    throw new Error('Missing upstream port for Class C nginx upstream');
  }

  const display = buildCustomerDisplayAddress({
    trafficClass: 'C',
    hostname,
    port: 443,
  });

  const infra = process.env.POST_PROVISION_INFRA_ENABLED === '1';

  logger.info(
    { order_id: orderId, hostname, upstream_port: Number(upstreamPort), infra_enabled: infra },
    'provisioning_worker_class_c_start',
  );

  if (infra) {
    const configText = buildNginxSiteConfig({
      hostname,
      upstreamHost: '127.0.0.1',
      upstreamPort: Number(upstreamPort),
    });
    await writeNginxSite({ hostname, configText });
    logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_nginx_site_written');
    await testNginxConfig();
    logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_nginx_test_ok');
    await reloadNginx();
    logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_nginx_reload_after_http');
    await obtainCertificateNginx({ hostname, email: LETSENCRYPT_EMAIL });
    logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_certbot_ok');
    await testNginxConfig();
    logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_nginx_test_ok_post_cert');
    await reloadNginx();
    logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_nginx_reload_after_cert');
  } else {
    logger.warn(
      { order_id: orderId, hostname },
      'provisioning_worker_class_c_no_infra_env_expect_manual_nginx_cert',
    );
  }

  if (!(await transitionConfiguringToVerifying(orderId))) {
    throw new Error('Could not move order to verifying (expected configuring)');
  }

  logger.info(
    { order_id: orderId, hostname, url: `https://${hostname}` },
    'provisioning_worker_class_c_https_probe_start',
  );
  const httpsOk = await waitForHttps({
    url: `https://${hostname}`,
    attempts: Number(process.env.POST_PROVISION_HTTPS_ATTEMPTS || 18),
    intervalMs: Number(process.env.POST_PROVISION_HTTPS_INTERVAL_MS || 5000),
  });
  if (!httpsOk) {
    throw new Error(`HTTPS health check failed for https://${hostname}`);
  }
  logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_https_probe_ok');

  await updateGameReachabilityDisplay(orderId, {
    hostname,
    displayAddress: display,
  });

  if (!(await transitionVerifyingToPlayable(orderId))) {
    throw new Error('Could not move order to playable (expected verifying)');
  }
  logger.info({ order_id: orderId, hostname }, 'provisioning_worker_class_c_order_playable');
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const orderId = job.data?.orderId;
    if (!orderId) {
      logger.warn({ job_id: job.id }, 'provisioning_worker_missing_order_id');
      return;
    }

    const order = await getOrder(orderId, true);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const status = String(order.status || '').toLowerCase();
    if (status === 'playable') {
      logger.info({ order_id: orderId }, 'provisioning_worker_already_playable');
      return { skipped: true, reason: 'already_playable' };
    }
    if (!order.ptero_server_id) {
      throw new Error('Order has no ptero_server_id; cannot post-configure');
    }

    if (status === 'verifying') {
      const resumePayload = resolvePostProvisionPayload(order, job.data);
      const tc = resumePayload.trafficClass || 'A';
      if (tc === 'C') {
        const hostname = resumePayload.hostname;
        if (!hostname) throw new Error('Missing Class C hostname on resume');
        const httpsOk = await waitForHttps({
          url: `https://${hostname}`,
          attempts: Number(process.env.POST_PROVISION_HTTPS_ATTEMPTS || 18),
          intervalMs: Number(process.env.POST_PROVISION_HTTPS_INTERVAL_MS || 5000),
        });
        if (!httpsOk) {
          throw new Error(`HTTPS health check failed for https://${hostname}`);
        }
        const display = buildCustomerDisplayAddress({
          trafficClass: 'C',
          hostname,
          port: 443,
        });
        await updateGameReachabilityDisplay(orderId, { hostname, displayAddress: display });
        if (!(await transitionVerifyingToPlayable(orderId))) {
          throw new Error('Could not move order to playable (resume verifying)');
        }
        return { success: true, orderId, resumed: true };
      }
      const brandHost = buildGameBrandHostname({
        gameKey: resumePayload.gameKey,
        orderId,
      });
      const port = resumePayload.primaryPort;
      if (port == null || !Number.isFinite(Number(port))) {
        throw new Error('Missing primary port on resume');
      }
      const policy = getEggRuntimePolicy(order.ptero_egg_id);
      const gameProto = policy?.network?.game?.protocol || 'tcp';
      if (gameProto !== 'udp') {
        const ok = await waitForTcp({
          host: brandHost,
          port: Number(port),
          attempts: Number(process.env.POST_PROVISION_TCP_ATTEMPTS || 18),
          intervalMs: Number(process.env.POST_PROVISION_TCP_INTERVAL_MS || 5000),
        });
        if (!ok) {
          throw new Error(`TCP health check failed for ${brandHost}:${port}`);
        }
      }
      if (!(await transitionVerifyingToPlayable(orderId))) {
        throw new Error('Could not move order to playable (resume verifying)');
      }
      return { success: true, orderId, resumed: true };
    }

    if (status === 'provisioned') {
      const moved = await transitionProvisionedToConfiguring(orderId);
      if (!moved) {
        const again = await getOrder(orderId);
        if (String(again?.status || '').toLowerCase() !== 'configuring') {
          throw new Error('Could not move order from provisioned to configuring');
        }
      }
    } else if (status !== 'configuring') {
      throw new Error(`Unexpected order status for provisioning worker: ${status}`);
    }

    const payload = resolvePostProvisionPayload(order, job.data);
    const trafficClass = payload.trafficClass || 'A';

    logger.info(
      {
        order_id: orderId,
        job_id: job.id,
        traffic_class: trafficClass,
        game_key: payload.gameKey,
        used_snapshot: Boolean(job.data?.provisionPlan),
      },
      'provisioning_worker_start',
    );

    if (trafficClass === 'C') {
      await processClassC({ orderId, payload });
    } else {
      await processClassAb({ orderId, payload, order });
    }

    logger.info({ order_id: orderId, job_id: job.id }, 'provisioning_worker_success');
    return { success: true, orderId };
  },
  {
    connection,
    concurrency: Number(
      process.env.PROVISIONING_WORKER_CONCURRENCY || process.env.POST_PROVISION_WORKER_CONCURRENCY || 2,
    ),
  },
);

worker.on('completed', (job) => {
  logger.info(
    { order_id: job.data?.orderId, job_id: job.id, returnvalue: job.returnvalue },
    'provisioning_worker_job_completed',
  );
});

worker.on('failed', (job, err) => {
  const orderId = job?.data?.orderId;
  const msg = err instanceof Error ? err.message : String(err);
  const maxAttempts = job?.opts?.attempts ?? 1;
  const attempt = (job?.attemptsMade ?? 0) + 1;
  logger.error(
    {
      order_id: orderId,
      job_id: job?.id,
      err: msg,
      attempt,
      max_attempts: maxAttempts,
    },
    'provisioning_worker_job_failed',
  );
});

logger.info(
  {
    queue: QUEUE_NAME,
    concurrency:
      process.env.PROVISIONING_WORKER_CONCURRENCY || process.env.POST_PROVISION_WORKER_CONCURRENCY || 2,
  },
  'provisioning_worker_listening',
);

#!/usr/bin/env node

import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBullmqRedisConnection } from '../lib/bullmqRedis.js';
import { getLogger } from '../lib/logger.js';
import { buildProvisionJobPayload } from '../lib/buildProvisionJobPayload.js';
import { getEggRuntimePolicy } from '../config/gameRuntimePolicy.js';
import { buildGameBrandHostname, buildCustomerDisplayAddress } from '../lib/serverBrandHostname.js';
import {
  getOrder,
  transitionProvisionedToConfiguring,
  transitionConfiguringToVerifying,
  transitionVerifyingToPlayable,
  updateGameReachabilityDisplay,
} from '../services/OrderService.js';
import { waitForTcp, waitForHttps } from './lib/postProvisionHealth.js';
import {
  buildNginxSiteConfig,
  writeNginxSite,
  testNginxConfig,
  reloadNginx,
} from './lib/postProvisionNginx.js';
import { obtainCertificateNginx } from './lib/postProvisionCerts.js';

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
      'post_provision_skip_tcp_probe_udp_game',
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

  if (infra) {
    const configText = buildNginxSiteConfig({
      hostname,
      upstreamHost: '127.0.0.1',
      upstreamPort: Number(upstreamPort),
    });
    await writeNginxSite({ hostname, configText });
    await testNginxConfig();
    await reloadNginx();
    await obtainCertificateNginx({ hostname, email: LETSENCRYPT_EMAIL });
    await testNginxConfig();
    await reloadNginx();
  } else {
    logger.warn(
      { order_id: orderId, hostname },
      'post_provision_class_c_no_infra_env_expect_manual_nginx_cert',
    );
  }

  if (!(await transitionConfiguringToVerifying(orderId))) {
    throw new Error('Could not move order to verifying (expected configuring)');
  }

  const httpsOk = await waitForHttps({
    url: `https://${hostname}`,
    attempts: Number(process.env.POST_PROVISION_HTTPS_ATTEMPTS || 18),
    intervalMs: Number(process.env.POST_PROVISION_HTTPS_INTERVAL_MS || 5000),
  });
  if (!httpsOk) {
    throw new Error(`HTTPS health check failed for https://${hostname}`);
  }

  await updateGameReachabilityDisplay(orderId, {
    hostname,
    displayAddress: display,
  });

  if (!(await transitionVerifyingToPlayable(orderId))) {
    throw new Error('Could not move order to playable (expected verifying)');
  }
}

const worker = new Worker(
  'post-provisioning',
  async (job) => {
    const orderId = job.data?.orderId;
    if (!orderId) {
      logger.warn({ job_id: job.id }, 'post_provision_worker_missing_order_id');
      return;
    }

    const order = await getOrder(orderId, true);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const status = String(order.status || '').toLowerCase();
    if (status === 'playable') {
      logger.info({ order_id: orderId }, 'post_provision_worker_already_playable');
      return { skipped: true, reason: 'already_playable' };
    }
    if (!order.ptero_server_id) {
      throw new Error('Order has no ptero_server_id; cannot post-configure');
    }

    if (status === 'verifying') {
      const resumePayload = buildProvisionJobPayload(order);
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
      throw new Error(`Unexpected order status for post-provision worker: ${status}`);
    }

    const payload = buildProvisionJobPayload(order);
    const trafficClass = payload.trafficClass || 'A';

    logger.info(
      {
        order_id: orderId,
        job_id: job.id,
        traffic_class: trafficClass,
        game_key: payload.gameKey,
      },
      'post_provision_worker_start',
    );

    if (trafficClass === 'C') {
      await processClassC({ orderId, payload });
    } else {
      await processClassAb({ orderId, payload, order });
    }

    logger.info({ order_id: orderId, job_id: job.id }, 'post_provision_worker_success');
    return { success: true, orderId };
  },
  {
    connection,
    concurrency: Number(process.env.POST_PROVISION_WORKER_CONCURRENCY || 2),
  },
);

worker.on('completed', (job) => {
  logger.info(
    { order_id: job.data?.orderId, job_id: job.id, returnvalue: job.returnvalue },
    'post_provision_worker_job_completed',
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
    'post_provision_worker_job_failed',
  );
});

logger.info({ concurrency: process.env.POST_PROVISION_WORKER_CONCURRENCY || 2 }, 'post_provision_worker_listening');

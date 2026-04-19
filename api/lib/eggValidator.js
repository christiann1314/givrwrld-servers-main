/**
 * Pre-flight egg validation for the provisioner.
 *
 * Called before creating a server on the Panel to ensure the egg definition
 * matches our internal catalog. Catches mismatched Docker images, missing
 * required env vars, and startup command drift before money is spent.
 */

import { getCatalogEntry, validateEggAgainstCatalog } from '../config/eggCatalog.js';
import { getLogger } from './logger.js';

const logger = getLogger();

/**
 * Validate an egg before provisioning. Returns a result object.
 *
 * @param {{
 *   eggId: number,
 *   panelDockerImage?: string,
 *   panelStartup?: string,
 *   panelEnvVars?: Record<string, string>,
 * }} opts
 * @returns {{ ok: boolean, warnings: string[], errors: string[], catalogEntry: import('../config/eggCatalog.js').EggCatalogEntry | null }}
 */
export function preflightEggValidation({ eggId, panelDockerImage, panelStartup, panelEnvVars }) {
  const warnings = [];
  const errors = [];

  const entry = getCatalogEntry(eggId);
  if (!entry) {
    errors.push(`Egg ${eggId} is not in the GIVRwrld catalog — provisioning with unknown egg`);
    return { ok: false, warnings, errors, catalogEntry: null };
  }

  const validation = validateEggAgainstCatalog(eggId, {
    dockerImage: panelDockerImage,
    startup: panelStartup,
  });

  if (!validation.valid) {
    for (const err of validation.errors) {
      warnings.push(err);
    }
  }

  if (panelEnvVars && entry.requiredEnvVars) {
    for (const [key, spec] of Object.entries(entry.requiredEnvVars)) {
      if (spec.rules.includes('required') && (!panelEnvVars[key] || panelEnvVars[key] === '')) {
        if (spec.default) {
          warnings.push(`Env var ${key} is empty; catalog default "${spec.default}" will be used`);
        } else {
          errors.push(`Required env var ${key} is not set and has no default`);
        }
      }
    }
  }

  const ok = errors.length === 0;

  if (warnings.length > 0 || errors.length > 0) {
    logger.warn(
      {
        event: 'egg_preflight',
        egg_id: eggId,
        game: entry.gameKey,
        variant: entry.variant,
        warnings,
        errors,
      },
      ok ? 'egg_preflight_warnings' : 'egg_preflight_failed',
    );
  }

  return { ok, warnings, errors, catalogEntry: entry };
}

/**
 * Resolve the Docker image for a given egg.
 * Prefers the catalog's defaultImage over whatever the Panel has,
 * unless the Panel image is in the catalog's allowed list.
 *
 * @param {number} eggId
 * @param {string} panelImage - The image currently set on the Panel egg
 * @returns {string} - The image to use for provisioning
 */
export function resolveDockerImage(eggId, panelImage) {
  const entry = getCatalogEntry(eggId);
  if (!entry) return panelImage || 'ghcr.io/pterodactyl/yolks:debian';

  const allowedImages = Object.values(entry.dockerImages);
  if (panelImage && allowedImages.includes(panelImage)) {
    return panelImage;
  }

  return entry.defaultImage;
}

/**
 * Fill in missing environment variables from the catalog defaults.
 *
 * @param {number} eggId
 * @param {Record<string, string>} environment - Current env vars (mutated in place)
 * @returns {Record<string, string>} - The same object, with defaults filled
 */
export function fillCatalogDefaults(eggId, environment) {
  const entry = getCatalogEntry(eggId);
  if (!entry?.requiredEnvVars) return environment;

  for (const [key, spec] of Object.entries(entry.requiredEnvVars)) {
    if ((!environment[key] || environment[key] === '') && spec.default) {
      environment[key] = spec.default;
    }
  }

  return environment;
}

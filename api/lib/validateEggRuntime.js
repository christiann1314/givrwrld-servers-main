/**
 * Ensure the Panel egg allows the Docker image we require for runtime (Among Us / tModLoader, etc.).
 *
 * @param {{
 *   panelUrl: string,
 *   panelAppKey: string,
 *   nestId: number,
 *   eggId: number,
 *   resolvedDockerImage: string,
 *   requiredDockerImage: string | null,
 * }} input
 */
export async function validateEggRuntimeForProvision(input) {
  const { panelUrl, panelAppKey, nestId, eggId, resolvedDockerImage, requiredDockerImage } = input;

  if (!requiredDockerImage || !String(requiredDockerImage).trim()) {
    return { ok: true, skipped: true };
  }

  const base = String(panelUrl).replace(/\/+$/, '');
  const url = `${base}/api/application/nests/${nestId}/eggs/${eggId}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${panelAppKey}`,
      'Accept': 'Application/vnd.pterodactyl.v1+json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Panel egg fetch failed (${res.status}) for egg ${eggId}: ${text.slice(0, 500)}`);
  }

  const body = await res.json();
  const attrs = body?.attributes || {};
  const dockerImages = attrs.docker_images;
  const allowed = new Set();

  if (dockerImages && typeof dockerImages === 'object' && !Array.isArray(dockerImages)) {
    for (const v of Object.values(dockerImages)) {
      if (typeof v === 'string' && v.trim()) {
        allowed.add(v.replace(/\\\//g, '/').trim());
      }
    }
  }

  const defaultImage = typeof attrs.docker_image === 'string' ? attrs.docker_image.replace(/\\\//g, '/').trim() : '';
  if (defaultImage) {
    allowed.add(defaultImage);
  }

  const req = String(requiredDockerImage).replace(/\\\//g, '/').trim();
  const resolved = String(resolvedDockerImage || '').replace(/\\\//g, '/').trim();

  if (allowed.size > 0 && !allowed.has(req)) {
    throw new Error(
      `Egg ${eggId} does not list required image "${req}" in docker_images; allowed: ${[...allowed].join(', ')}`,
    );
  }

  if (resolved && req && resolved !== req) {
    throw new Error(`Resolved create image "${resolved}" does not match policy required image "${req}" for egg ${eggId}`);
  }

  return { ok: true, allowed: [...allowed] };
}

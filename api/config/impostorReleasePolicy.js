/**
 * Among Us (Impostor) download URL policy — keep Panel egg runtime and binary in sync.
 *
 * Impostor ≥1.9 targets .NET 8. Use a .NET 8 egg image (e.g. ghcr.io/parkervcp/yolks:dotnet_8) when
 * using strategy `latest`.
 *
 * Env (api/.env):
 *   GAME_SERVER_PUBLIC_HOST or IMPOSTOR_SERVER_PUBLIC_HOST — Impostor Server:PublicIp (else provision uses
 *     allocation alias, then IP). PublicPort is set from the primary game port unless the egg overrides it.
 *   IMPOSTOR_DOWNLOAD_URL       — full URL override (wins)
 *   IMPOSTOR_RELEASE_STRATEGY   — "latest" | "pinned" (default: latest)
 *   IMPOSTOR_RELEASE_TAG        — Git tag when pinned (default: v1.8.4, pre–.NET 8 / .NET 7 era)
 *
 * Pinned builds use the official linux-x64 **tar.gz** for that tag (not the convenience zip).
 * Egg install scripts must support tar.gz (see upgrade-pterodactyl-eggs Among Us install).
 */

const LATEST_ZIP =
  'https://github.com/Impostor/Impostor/releases/latest/download/Impostor-linux-x64.zip';

/** Last 1.8.x before v1.9.0 (.NET 8); pairs with dotnet_7 images if you must stay on them. */
const DEFAULT_PINNED_TAG = 'v1.8.4';

/**
 * @returns {string} URL passed to DOWNLOAD_URL for Among Us eggs
 */
export function getImpostorLinuxDownloadUrl() {
  const override = String(process.env.IMPOSTOR_DOWNLOAD_URL || '').trim();
  if (override) return override;

  const strategy = String(process.env.IMPOSTOR_RELEASE_STRATEGY || 'latest').toLowerCase();
  if (strategy === 'pinned') {
    const tag = String(process.env.IMPOSTOR_RELEASE_TAG || DEFAULT_PINNED_TAG).trim();
    const ver = tag.replace(/^v/i, '');
    return `https://github.com/Impostor/Impostor/releases/download/${tag}/Impostor-Server_${ver}_linux-x64.tar.gz`;
  }

  return LATEST_ZIP;
}

export const impostorPolicy = {
  eggRuntimeNote:
    'Among Us egg Docker image should match Impostor: .NET 8 image for IMPOSTOR_RELEASE_STRATEGY=latest; .NET 7 only with pinned pre-1.9 tar.gz + matching extract in egg install.',
  defaultPinnedTag: DEFAULT_PINNED_TAG,
};

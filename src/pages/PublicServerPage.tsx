import * as React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Copy, ExternalLink, Server, Users, Radio, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import PublicStreamSection, { type PublicStreamData } from "@/components/public/PublicStreamSection";

interface PublicServerResponse {
  slug: string;
  streamer_name: string | null;
  game: string | null;
  server_name: string | null;
  server_description: string | null;
  status: string;
  players_online: number;
  players_max: number;
  join: {
    address: string;
    copy_text: string;
  } | null;
  discord_url: string | null;
  stream: PublicStreamData | null;
  snapshot_captured_at: string | null;
  is_stale: boolean;
}

const statusTone: Record<string, string> = {
  online: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
  offline: "bg-red-500/20 text-red-200 border-red-400/50",
  provisioning: "bg-amber-500/20 text-amber-200 border-amber-400/50",
  error: "bg-red-500/20 text-red-200 border-red-400/50",
  unknown: "bg-gray-500/20 text-gray-200 border-gray-400/40",
};

const PublicServerPage: React.FC = () => {
  const { slug = "" } = useParams();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<PublicServerResponse | null>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "error">("idle");

  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getPublicServerPage(slug);
        if (!active) return;
        setPage(response);
      } catch (err: any) {
        if (!active) return;
        setPage(null);
        setError(err?.message || "Unable to load public server page.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (slug) {
      load();
    } else {
      setLoading(false);
      setError("Server page not found.");
    }

    return () => {
      active = false;
    };
  }, [slug]);

  async function handleCopyAddress() {
    if (!page?.join?.copy_text) return;
    try {
      await navigator.clipboard.writeText(page.join.copy_text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  const statusKey = String(page?.status || "unknown").toLowerCase();
  const statusClassName = statusTone[statusKey] || statusTone.unknown;

  const state = location.state as any;
  const from = state?.from;
  let backHref = "/";
  let backLabel = "Back to Home";

  if (from === "streamers") {
    backHref = "/streamers";
    backLabel = "Back to Streamers";
  } else if (from === "dashboard-server" && state?.orderId) {
    backHref = `/dashboard/services/${state.orderId}`;
    backLabel = "Back to Game Panel";
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/75 via-gray-900/60 to-gray-900/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/15 via-transparent to-blue-900/10" />
      </div>

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <Link
              to={backHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-black/55 text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition-colors"
            >
              <ArrowLeft size={18} />
              {backLabel}
            </Link>
          </div>

          {loading ? (
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg text-gray-200">
              Loading server page...
            </div>
          ) : error || !page ? (
            <div className="rounded-xl border border-red-500/40 bg-red-950/80 p-6 shadow-lg">
              <h1 className="text-xl font-semibold text-white mb-2">Public server page unavailable</h1>
              <p className="text-red-100 text-sm">
                {error || "This public server page could not be found."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {page.is_stale && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/60 p-4 shadow-lg">
                  <div className="text-sm font-semibold text-amber-100 mb-1">Status is temporarily stale-safe</div>
                  <p className="text-sm text-amber-200">
                    Live infrastructure checks are unavailable right now, so this page is showing the last known safe snapshot instead of real-time status.
                  </p>
                </div>
              )}

              {page.status === "unknown" && !page.join && (
                <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-4 shadow-lg">
                  <div className="text-sm font-semibold text-white mb-1">Public details still warming up</div>
                  <p className="text-sm text-gray-300">
                    This server page is live, but status and join details are still being prepared from the latest safe snapshot.
                  </p>
                </div>
              )}

              <section className="rounded-2xl border border-gray-700/60 bg-gray-900/90 p-6 sm:p-8 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-3">
                      Public Server Page
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                      {page.streamer_name || page.server_name || page.game || "Game Server"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                      {page.game && (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-800/80 bg-black/40">
                          <Server size={14} className="text-emerald-300" />
                          <span className="text-gray-300">Game</span>
                          <span className="font-semibold text-white">{page.game}</span>
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${statusClassName}`}>
                        <Radio size={14} />
                        <span className="font-semibold capitalize">{page.status}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-800/80 bg-black/40">
                        <Users size={14} className="text-emerald-300" />
                        <span className="text-gray-300">Players</span>
                        <span className="font-semibold text-white">
                          {page.players_online} / {page.players_max}
                        </span>
                      </span>
                    </div>
                    <p className="text-base text-gray-200 leading-relaxed">
                      {page.server_description ||
                        `${page.server_name || "This server"} is live for the community. Watch the stream and jump into the server when you're ready.`}
                    </p>
                  </div>

                  <div className="w-full lg:max-w-sm space-y-3">
                    <div className="rounded-xl border border-gray-700/60 bg-black/35 p-4">
                      <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">
                        Join Server
                      </div>
                      {page.join ? (
                        <>
                          <div className="text-lg font-semibold text-white break-all mb-3">
                            {page.join.address}
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyAddress}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                          >
                            <Copy size={16} />
                            {copyState === "copied"
                              ? "Copied"
                              : copyState === "error"
                              ? "Copy failed"
                              : "Copy address"}
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-gray-300">
                          Join info will appear here once a public-safe address is configured.
                        </p>
                      )}
                    </div>

                    {page.discord_url && (
                      <a
                        href={page.discord_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/40 bg-black/35 text-emerald-200 hover:text-white hover:border-emerald-400 transition-colors text-sm font-semibold"
                      >
                        Join Discord
                        <ExternalLink size={16} />
                      </a>
                    )}

                    {page.stream?.url && (
                      <a
                        href={page.stream.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-600 bg-black/35 text-gray-100 hover:text-white hover:border-gray-500 transition-colors text-sm font-semibold"
                      >
                        Watch on {page.stream.platform === "kick" ? "Kick" : "Twitch"}
                        <ExternalLink size={16} />
                      </a>
                    )}

                    {page.snapshot_captured_at && (
                      <div className="text-xs text-gray-400 px-1">
                        Status snapshot from {new Date(page.snapshot_captured_at).toLocaleString()}
                        {page.is_stale ? " (stale-safe)" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PublicStreamSection streamerName={page.streamer_name} stream={page.stream} />
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-5 shadow-lg">
                    <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">
                      Server Details
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-gray-400">Server</dt>
                        <dd className="font-semibold text-white text-right">
                          {page.server_name || "Community server"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-gray-400">Game</dt>
                        <dd className="font-semibold text-white text-right">
                          {page.game || "Unknown"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-gray-400">Livestream</dt>
                        <dd className="font-semibold text-white text-right capitalize">
                          {page.stream?.platform || "Not linked"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-5 shadow-lg">
                    <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">
                      Community
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Follow the stream, join the Discord, and hop into the server using the public join details when they are available.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicServerPage;

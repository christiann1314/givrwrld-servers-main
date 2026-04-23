import * as React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Radio, Server, Users, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { PublicStreamData } from "@/components/public/PublicStreamSection";

interface PublicStreamerDirectoryItem {
  slug: string;
  streamer_name: string | null;
  game: string | null;
  server_name: string | null;
  server_description: string | null;
  status: string;
  players_online: number;
  players_max: number;
  discord_url: string | null;
  stream: PublicStreamData;
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

const StreamersPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [streamers, setStreamers] = React.useState<PublicStreamerDirectoryItem[]>([]);

  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getPublicStreamers();
        if (!active) return;
        setStreamers(Array.isArray(response?.streamers) ? response.streamers : []);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load streamer directory.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

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
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                to="/"
                className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-black/55 text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <ArrowLeft size={18} />
                Back to Home
              </Link>
              <div className="text-xs uppercase tracking-wide font-medium text-emerald-300/90 mb-3">
                GIVRwrld Streamers
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Discover creators streaming on GIVRwrld servers
              </h1>
              <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-200 leading-relaxed">
                Browse public streamer pages powered by GIVRwrld. Use each card to visit the creator&apos;s
                server page or watch them directly on Twitch or Kick.
              </p>
            </div>
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/85 px-4 py-3 text-sm text-gray-300 shadow-lg">
              GIVRwrld is the discovery layer.
              <span className="block text-white font-medium mt-1">
                Watch on Twitch or Kick for the full stream experience.
              </span>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg text-gray-200">
              Loading streamers...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-950/80 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-2">Streamer directory unavailable</h2>
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          ) : streamers.length === 0 ? (
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-2">No streamers listed yet</h2>
              <p className="text-sm text-gray-300">
                Once server owners enable their public page and connect a Twitch or Kick channel, they&apos;ll
                appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {streamers.map((streamer) => {
                const statusClassName =
                  statusTone[String(streamer.status || "unknown").toLowerCase()] || statusTone.unknown;
                const title =
                  streamer.streamer_name || streamer.server_name || streamer.game || "GIVRwrld Streamer";
                const watchLabel =
                  streamer.stream.platform === "kick" ? "Watch on Kick" : "Watch on Twitch";

                return (
                  <article
                    key={streamer.slug}
                    className="rounded-2xl border border-gray-700/60 bg-gray-900/90 p-5 shadow-xl backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">
                          Public Streamer Page
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                        <p className="mt-1 text-sm text-gray-300 capitalize">
                          {streamer.stream.platform} streamer
                          {streamer.game ? ` · ${streamer.game}` : ""}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-semibold ${statusClassName}`}
                      >
                        <Radio size={14} />
                        <span className="capitalize">{streamer.status}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                      {streamer.game && (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-800/80 bg-black/40">
                          <Server size={14} className="text-emerald-300" />
                          <span className="font-semibold text-white">{streamer.game}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-800/80 bg-black/40">
                        <Users size={14} className="text-emerald-300" />
                        <span className="text-gray-300">Players</span>
                        <span className="font-semibold text-white">
                          {streamer.players_online} / {streamer.players_max}
                        </span>
                      </span>
                    </div>

                    <div className="rounded-xl border border-gray-700/60 bg-black/30 p-4 mb-4">
                      <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">
                        Server
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {streamer.server_name || "Community server"}
                      </div>
                      <p className="mt-2 text-sm text-gray-300 leading-relaxed min-h-[3rem]">
                        {streamer.server_description ||
                          "Watch the stream, visit the public server page, and jump into the community when details are available."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <a
                        href={streamer.stream.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                      >
                        {watchLabel}
                        <ExternalLink size={16} />
                      </a>
                      <Link
                        to={`/server/${streamer.slug}`}
                        state={{ from: "streamers" }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-600 text-sm font-semibold text-gray-200 hover:text-white hover:border-gray-500 transition-colors"
                      >
                        View Server Page
                      </Link>
                      {streamer.discord_url && (
                        <a
                          href={streamer.discord_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/40 bg-black/30 text-sm font-semibold text-emerald-200 hover:text-white hover:border-emerald-400 transition-colors"
                        >
                          Join Discord
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>

                    {streamer.snapshot_captured_at && (
                      <div className="mt-4 text-xs text-gray-400">
                        Snapshot from {new Date(streamer.snapshot_captured_at).toLocaleString()}
                        {streamer.is_stale ? " (stale-safe)" : ""}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamersPage;

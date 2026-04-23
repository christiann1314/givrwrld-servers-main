import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Radio,
  Server,
  Users,
  Home,
  Library,
  Scissors,
  Send,
  Link2,
  Bell,
  Crown,
  Film,
  Smartphone,
  Sparkles,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { api, getApiBase } from "@/lib/api";
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

type WorkspaceSummary = {
  ok?: boolean;
  tier?: string;
  linked_platforms?: string[];
  /** Max linked social accounts (FREE tier cap in UI). */
  linked_max?: number;
  workspace_ready_pct?: number;
  headline?: string;
  body?: string;
};

type AnalyticsSummary = {
  ok?: boolean;
  headline?: string;
  status?: string;
  clips_today?: number;
  hours_captured?: number;
  note?: string;
};

const DEFAULT_SUMMARY: WorkspaceSummary = {
  tier: "free",
  linked_platforms: [],
  linked_max: 5,
  workspace_ready_pct: 39,
  headline: "We're prepping your first workspace.",
  body: "Link a platform to pull VODs automatically, or import a file to start clipping right away.",
};

const DEFAULT_ANALYTICS: AnalyticsSummary = {
  headline: "Today's signal",
  status: "idle",
  clips_today: 0,
  hours_captured: 0,
  note: "Connect Twitch or Kick on your public server page to unlock live signals here.",
};

const statusTone: Record<string, string> = {
  online: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
  offline: "bg-red-500/20 text-red-200 border-red-400/50",
  provisioning: "bg-amber-500/20 text-amber-200 border-amber-400/50",
  error: "bg-red-500/20 text-red-200 border-red-400/50",
  unknown: "bg-gray-500/20 text-gray-200 border-gray-400/40",
};

const SIDEBAR = [
  { id: "home", label: "Home", icon: Home, active: true },
  { id: "library", label: "Library", icon: Library, active: false },
  { id: "edits", label: "Edits", icon: Scissors, active: false },
  { id: "publisher", label: "Publisher", icon: Send, active: false },
  { id: "connections", label: "Connections", icon: Link2, active: false },
] as const;

const GOAL_CARDS = [
  {
    icon: Sparkles,
    title: "AI highlights",
    body: "Auto-detect best moments from long streams and save them as clips.",
  },
  {
    icon: Smartphone,
    title: "Vertical edits",
    body: "Turn landscape gameplay into TikTok / Shorts / Reels layouts in one flow.",
  },
  {
    icon: Film,
    title: "Smart polish",
    body: "Captions, memes, zooms, and pacing tuned for social ΓÇö without a full NLE.",
  },
  {
    icon: CalendarClock,
    title: "Schedule & publish",
    body: "Queue exports and push to every channel you care about from one hub.",
  },
];

function RingProgress({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div
      className="relative h-32 w-32 shrink-0 rounded-full p-[3px]"
      style={{
        background: `conic-gradient(rgb(52 211 153) ${p * 3.6}deg, rgba(55, 65, 81, 0.75) 0deg)`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0b0d12]">
        <span className="text-2xl font-bold text-emerald-300">{p}%</span>
      </div>
    </div>
  );
}

const StreamersPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [streamers, setStreamers] = React.useState<PublicStreamerDirectoryItem[]>([]);
  const [summary, setSummary] = React.useState<WorkspaceSummary>(DEFAULT_SUMMARY);
  const [analytics, setAnalytics] = React.useState<AnalyticsSummary>(DEFAULT_ANALYTICS);

  React.useEffect(() => {
    let active = true;
    const base = getApiBase().replace(/\/+$/, "");

    async function loadWorkspace() {
      try {
        const [sRes, aRes] = await Promise.all([
          fetch(`${base}/api/streamers/summary`, { credentials: "include" }),
          fetch(`${base}/api/streamers/analytics/summary`, { credentials: "include" }),
        ]);
        const sJson = sRes.ok ? ((await sRes.json()) as WorkspaceSummary) : null;
        const aJson = aRes.ok ? ((await aRes.json()) as AnalyticsSummary) : null;
        if (!active) return;
        if (sJson) setSummary({ ...DEFAULT_SUMMARY, ...sJson });
        if (aJson) setAnalytics({ ...DEFAULT_ANALYTICS, ...aJson });
      } catch {
        /* defaults already set */
      }
    }

    async function loadDirectory() {
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

    void loadWorkspace();
    void loadDirectory();
    return () => {
      active = false;
    };
  }, []);

  const tierLabel = (summary.tier || "free").toUpperCase();
  const readyPct = summary.workspace_ready_pct ?? 39;
  const workspaceHeadline = summary.headline || DEFAULT_SUMMARY.headline!;
  const workspaceBody = summary.body || DEFAULT_SUMMARY.body!;
  const signalHeadline = analytics.headline || DEFAULT_ANALYTICS.headline!;
  const signalNote = analytics.note || DEFAULT_ANALYTICS.note!;

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/65 to-gray-900/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/12 via-transparent to-blue-900/8" />
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-black/55 text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:border-emerald-400 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Home
            </Link>
            <Link
              to="/how-to#stream-station"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-emerald-300 hover:text-emerald-200"
            >
              How Stream Station works
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Stream Station workspace */}
          <div className="rounded-2xl border border-gray-800/90 bg-[#07080c]/95 shadow-2xl shadow-black/50 overflow-hidden mb-12">
            <div className="flex flex-col lg:flex-row min-h-[520px]">
              {/* Sidebar */}
              <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800/90 bg-[#060708]/95">
                <div className="px-4 py-5 border-b border-gray-800/80">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-400/90">STREAM STATION</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium tracking-wide">CLIP · EDIT · PUBLISH</p>
                </div>
                <nav className="flex flex-row overflow-x-auto lg:flex-col gap-1 p-2 lg:p-3">
                  {SIDEBAR.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap lg:w-full ${
                          item.active
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/35"
                            : "text-gray-400 border border-transparent hover:bg-gray-800/60 hover:text-gray-200"
                        }`}
                      >
                        <Icon size={18} className={item.active ? "text-emerald-300" : "text-gray-500"} />
                        {item.label}
                      </div>
                    );
                  })}
                </nav>
              </aside>

              {/* Main workspace */}
              <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0a0c11] to-[#060708]">
                {/* Top bar */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-gray-800/80 bg-black/25">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded border border-gray-600 text-gray-300">
                    {tierLabel}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline tabular-nums">
                    Linked {(summary.linked_platforms?.length ?? 0)}/{summary.linked_max ?? 5}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                    {["Tw", "Yt", "K", "TT"].map((x) => (
                      <span
                        key={x}
                        className="h-7 w-7 rounded-md border border-gray-700/80 bg-gray-900/80 flex items-center justify-center"
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    GO PRO
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600"
                  >
                    Assistant
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hidden sm:inline"
                  >
                    New clip
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hidden sm:inline"
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                  </button>
                </div>

                <div className="flex-1 px-4 sm:px-6 py-6 space-y-6 overflow-y-auto">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown size={16} className="text-amber-400/90" />
                      <span className="text-xs text-gray-500">Creator workspace</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Stream Station</h1>
                    <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-3xl leading-relaxed">
                      Clip long sessions, polish for short-form, and publish to every channel you care about ΓÇö in one
                      workspace styled for GIVRwrld creators.
                    </p>
                  </div>

                  {/* Live feed */}
                  <div className="rounded-xl border border-gray-800/90 overflow-hidden bg-gray-950/80">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/80 bg-black/40">
                      <span className="text-sm font-semibold text-white">Live feed</span>
                      <span className="text-[10px] font-bold tracking-wider text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded">
                        TWITCH
                      </span>
                    </div>
                    <div className="relative h-48 sm:h-56 bg-gradient-to-br from-violet-950/80 via-gray-900 to-amber-950/40 flex items-center justify-center">
                      <div className="text-center px-6">
                        <p className="text-sm font-medium text-white mb-1">Offline preview</p>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                          Link Twitch or Kick from your server&apos;s public page — the player lights up when your
                          channel is live.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Today's signal */}
                  <div className="rounded-xl border border-gray-800/90 bg-black/35 px-4 py-4">
                    <div className="text-xs font-bold tracking-widest text-gray-500 mb-2">{signalHeadline}</div>
                    <p className="text-sm text-gray-300 leading-relaxed">{signalNote}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Clips today: {analytics.clips_today ?? 0}</span>
                      <span>Hours captured: {analytics.hours_captured ?? 0}</span>
                      <span className="capitalize">Status: {analytics.status || "idle"}</span>
                    </div>
                  </div>

                  {/* Onboarding */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 sm:px-6 py-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Tell us what you&apos;re here for</h2>
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div>
                        <div className="flex flex-wrap gap-2 mb-5 text-xs font-semibold text-gray-500">
                          <span className="text-emerald-300 border-b-2 border-emerald-400 pb-1">1 Goals</span>
                          <span>2 Connections</span>
                          <span>3 Go live</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {GOAL_CARDS.map(({ icon: Icon, title, body }) => (
                            <div
                              key={title}
                              className="rounded-lg border border-gray-800/80 bg-gray-950/60 p-4 hover:border-emerald-500/30 transition-colors"
                            >
                              <Icon size={20} className="text-emerald-400 mb-2" />
                              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                              <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-800/80 bg-black/40 p-5 flex flex-col sm:flex-row gap-5 items-center">
                        <RingProgress pct={readyPct} />
                        <div className="flex-1 text-center sm:text-left">
                          <p className="text-sm font-semibold text-white mb-1">{workspaceHeadline}</p>
                          <p className="text-xs text-gray-400 leading-relaxed mb-4">{workspaceBody}</p>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                          >
                            Check status
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Public directory */}
          <section id="discover-streamers" className="scroll-mt-24">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
              <div>
                <div className="text-xs uppercase tracking-wide font-medium text-emerald-300/90 mb-2">
                  Discover streamers
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Public pages powered by GIVRwrld
                </h2>
                <p className="mt-2 max-w-3xl text-sm sm:text-base text-gray-200 leading-relaxed">
                  Browse creators with a public server page. Watch on Twitch or Kick, then jump into their community
                  server card below.
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
                <h3 className="text-xl font-semibold text-white mb-2">Streamer directory unavailable</h3>
                <p className="text-red-100 text-sm">{error}</p>
              </div>
            ) : streamers.length === 0 ? (
              <div className="rounded-xl border border-gray-700/60 bg-gray-900/90 p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-2">No streamers listed yet</h3>
                <p className="text-sm text-gray-300">
                  Once server owners enable their public page and connect a Twitch or Kick channel, they&apos;ll appear
                  here.
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
                          <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
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
                        <div className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-2">Server</div>
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
          </section>
        </div>
      </div>
    </div>
  );
};

export default StreamersPage;

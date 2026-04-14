import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Server, Cpu, HardDrive, MapPin, Power, PowerOff, RefreshCcw, ExternalLink, Loader2 } from "lucide-react";
import api, { getApiBase } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { getAccessToken } from "@/lib/auth";
import { ENV } from "@/config/env";

interface ServerPlan {
  id: string;
  ram_gb?: number | null;
  vcores?: number | null;
  ssd_gb?: number | null;
}

interface PanelDetails {
  id: number;
  identifier: string;
  name: string;
  description?: string | null;
  limits: {
    memoryMb: number;
    diskMb: number;
    cpuPercent: number;
  };
  allocations: {
    primaryIp: string | null;
    primaryPort: number | null;
  };
}

interface ServerDetailsResponse {
  id: string;
  status: string;
  game: string;
  region: string;
  server_name: string;
  plan: ServerPlan;
  panel?: PanelDetails | null;
  ptero_identifier?: string | null;
  ptero_server_id?: number | null;
}

interface ServerResourcesResponse {
  state: string;
  cpu_percent: number;
  memory_bytes: number;
  memory_limit_bytes: number | null;
  disk_bytes: number;
  players_online: number;
  players_max: number;
  uptime_seconds: number;
  measured_at: string;
}

interface PublicPageSettingsResponse {
  order_id: string;
  public_page_enabled: number;
  public_slug: string | null;
  streamer_name: string | null;
  stream_platform: "twitch" | "kick" | null;
  stream_channel: string | null;
  stream_url: string | null;
  discord_url: string | null;
  server_description: string | null;
  kick_embed_enabled: number;
  eligible: boolean;
}

interface PublicPageFormState {
  public_page_enabled: boolean;
  public_slug: string;
  streamer_name: string;
  stream_platform: "twitch" | "kick";
  stream_channel: string;
  stream_url: string;
  discord_url: string;
  server_description: string;
}

function formatBytesToGb(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const safe = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function normalizeSlugInput(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildPublicForm(settings: PublicPageSettingsResponse | null): PublicPageFormState {
  return {
    public_page_enabled: Number(settings?.public_page_enabled || 0) === 1,
    public_slug: settings?.public_slug || "",
    streamer_name: settings?.streamer_name || "",
    stream_platform: settings?.stream_platform || "twitch",
    stream_channel: settings?.stream_channel || "",
    stream_url: settings?.stream_url || "",
    discord_url: settings?.discord_url || "",
    server_description: settings?.server_description || "",
  };
}

function PanelTabLoader({ orderId, endpoint, title, queryParams, children }: {
  orderId: string;
  endpoint: string;
  title: string;
  queryParams?: Record<string, string>;
  children: (data: any) => React.ReactNode;
}) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const base = getApiBase().replace(/\/+$/, "");
        const qs = queryParams ? "?" + new URLSearchParams(queryParams).toString() : "";
        const token = (await import("@/lib/auth")).getAccessToken();
        const res = await fetch(`${base}/api/panel/${orderId}/${endpoint}${qs}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!cancelled) {
          if (!res.ok) throw new Error(`Panel returned ${res.status}`);
          setData(await res.json());
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, endpoint]);

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {loading && <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin" size={16} /> Loading...</div>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && data && children(data)}
    </div>
  );
}

type ServerDetailsTab =
  | "console"
  | "overview"
  | "metrics"
  | "files"
  | "databases"
  | "schedules"
  | "users"
  | "backups"
  | "network"
  | "startup"
  | "settings"
  | "activity";

const DashboardServerDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [details, setDetails] = React.useState<ServerDetailsResponse | null>(null);
  const [resources, setResources] = React.useState<ServerResourcesResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState<ServerDetailsTab>("console");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [powerLoading, setPowerLoading] = React.useState<"start" | "stop" | "restart" | null>(null);
  const [metricsError, setMetricsError] = React.useState<string | null>(null);
  const [publicPage, setPublicPage] = React.useState<PublicPageSettingsResponse | null>(null);
  const [publicForm, setPublicForm] = React.useState<PublicPageFormState>({
    public_page_enabled: false,
    public_slug: "",
    streamer_name: "",
    stream_platform: "twitch",
    stream_channel: "",
    stream_url: "",
    discord_url: "",
    server_description: "",
  });
  const [publicPageLoading, setPublicPageLoading] = React.useState(true);
  const [publicPageSaving, setPublicPageSaving] = React.useState(false);
  const [publicPageErrors, setPublicPageErrors] = React.useState<Record<string, string>>({});
  const [slugStatus, setSlugStatus] = React.useState<"idle" | "checking" | "available" | "taken">("idle");
  const [publicUrlCopyState, setPublicUrlCopyState] = React.useState<"idle" | "copied" | "error">("idle");
  const [consoleLines, setConsoleLines] = React.useState<string[]>([]);
  const [consoleInput, setConsoleInput] = React.useState("");
  const [consoleStatus, setConsoleStatus] = React.useState<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected"
  );
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = React.useRef(0);
  const manualCloseRef = React.useRef(false);
  const consoleOpeningRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orderId) {
        setError("Missing server id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPublicPageLoading(true);
        setError(null);

        const [server, live, publicPageResponse] = await Promise.allSettled([
          api.getServer(orderId),
          api.getServerResources(orderId),
          api.getServerPublicPage(orderId),
        ]);

        if (cancelled) return;

        if (server.status === "fulfilled") {
          setDetails(server.value as ServerDetailsResponse);
        } else {
          setError(server.reason instanceof Error ? server.reason.message : "Failed to load server");
        }

        if (live.status === "fulfilled") {
          setResources(live.value as ServerResourcesResponse);
        }
        if (publicPageResponse.status === "fulfilled") {
          const next = publicPageResponse.value as PublicPageSettingsResponse;
          setPublicPage(next);
          setPublicForm(buildPublicForm(next));
          setPublicPageErrors({});
          setSlugStatus("idle");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load server");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPublicPageLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Re-fetch server details while provisioning completes or panel metadata is still missing (single load() is not enough).
  React.useEffect(() => {
    if (!orderId || !details) return;

    const status = String(details.status || "").toLowerCase();
    const waitingForPanel =
      details.ptero_server_id != null &&
      !details.panel &&
      (status === "provisioned" || status === "provisioning");
    const stillProvisioning = details.ptero_server_id == null && status === "provisioning";

    if (!waitingForPanel && !stillProvisioning) return;

    let cancelled = false;
    let ticks = 0;
    const maxTicks = 24; // ~2 minutes at 5s

    const id = window.setInterval(async () => {
      ticks += 1;
      if (ticks > maxTicks || cancelled) {
        window.clearInterval(id);
        return;
      }
      try {
        const next = await api.getServer(orderId);
        if (cancelled) return;
        setDetails(next as ServerDetailsResponse);
        const st = String(next.status || "").toLowerCase();
        if (st === "error" || st === "canceled") {
          window.clearInterval(id);
          return;
        }
        if (next.panel || (next.ptero_server_id == null && st !== "provisioning")) {
          window.clearInterval(id);
        }
      } catch {
        // keep trying until maxTicks
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, details?.status, details?.ptero_server_id, details?.panel]);

  // Keep CPU/RAM/disk/state in sync with Pterodactyl while this page is open (not only on Metrics tab).
  React.useEffect(() => {
    if (!orderId || !details?.ptero_server_id) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const live = await api.getServerResources(orderId);
        if (!cancelled) {
          setResources(live as ServerResourcesResponse);
          setMetricsError(null);
        }
      } catch {
        if (!cancelled) {
          setMetricsError((prev) => prev ?? "Could not refresh live stats");
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, details?.ptero_server_id]);

  const hasPanel = !!details?.panel;
  const panelServerIdentifier = details?.panel?.identifier || details?.ptero_identifier || null;
  const currentState = (resources?.state || details?.status || "").toLowerCase();
  const isProvisioning =
    (details?.ptero_server_id == null && (details?.status || "").toLowerCase() === "provisioning") ||
    currentState === "provisioning";
  const livePanelState = String(resources?.state || "").toLowerCase();
  const orderStatusLower = String(details?.status || "").toLowerCase();
  const orderImpliesPanelRunning = ["playable", "configuring", "verifying"].includes(orderStatusLower);
  const effectivePowerState =
    livePanelState ||
    (orderImpliesPanelRunning ? "online" : orderStatusLower);
  const isPoweredOn =
    effectivePowerState.startsWith("online") ||
    effectivePowerState === "running" ||
    effectivePowerState === "starting";
  const canStart =
    !isProvisioning &&
    (effectivePowerState === "offline" ||
      effectivePowerState === "stopped" ||
      effectivePowerState === "stopping");
  const canStop = !isProvisioning && (isPoweredOn || effectivePowerState === "stopping");
  const canRestart = !isProvisioning && (isPoweredOn || effectivePowerState === "stopping");

  function buildConsoleWsUrl(id: string) {
    const base = getApiBase().replace(/\/+$/, "") || window.location.origin.replace(/\/+$/, "");
    const wsProtocol = base.startsWith("https://") ? "wss://" : "ws://";
    const host = base.replace(/^https?:\/\//, "");
    const token = getAccessToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${wsProtocol}${host}/ws/servers/${encodeURIComponent(id)}/console${qs}`;
  }

  const appendConsoleLine = React.useCallback((line: string) => {
    setConsoleLines((prev) => {
      const next = [...prev, line];
      return next.slice(-500);
    });
  }, []);

  const connectConsole = React.useCallback(() => {
    if (!orderId || !details) return;
    if (wsRef.current || consoleOpeningRef.current) return;

    manualCloseRef.current = false;
    consoleOpeningRef.current = true;
    setConsoleStatus("connecting");

    const url = buildConsoleWsUrl(orderId);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      consoleOpeningRef.current = false;
      setConsoleStatus("error");
      appendConsoleLine("[console] Failed to open websocket.");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      consoleOpeningRef.current = false;
      if (wsRef.current !== ws) return;
      reconnectAttemptsRef.current = 0;
      setConsoleStatus("connected");
      appendConsoleLine("[console] Connected.");

      if (details) {
        const p = details.plan;
        const cpu = p.vcores ? `${p.vcores} vCPU` : "—";
        const ram = p.ram_gb ? `${p.ram_gb} GB` : "—";
        const disk = p.ssd_gb ? `${p.ssd_gb} GB NVMe` : "—";
        const name = details.server_name || "—";
        const game = details.game ? details.game.charAt(0).toUpperCase() + details.game.slice(1) : "—";
        const region = details.region || "—";
        const addr =
          details.panel?.allocations.primaryIp && details.panel.allocations.primaryPort
            ? `${details.panel.allocations.primaryIp}:${details.panel.allocations.primaryPort}`
            : null;
        appendConsoleLine("─── Server Specs ───────────────────────────────");
        appendConsoleLine(`  Name: ${name}  •  Game: ${game}  •  Region: ${region}`);
        appendConsoleLine(`  CPU: ${cpu}  •  RAM: ${ram}  •  Disk: ${disk}`);
        if (addr) appendConsoleLine(`  Address: ${addr}`);
        appendConsoleLine("────────────────────────────────────────────────");
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (payload?.type === "console.output" && typeof payload.line === "string") {
          appendConsoleLine(payload.line);
        } else if (payload?.type === "console.system" && typeof payload.message === "string") {
          appendConsoleLine(`[system] ${payload.message}`);
        } else if (payload?.type === "console.idle_timeout") {
          appendConsoleLine("[system] Console closed due to inactivity.");
        } else if (payload?.type === "error") {
          const msg = typeof payload.message === "string" ? payload.message : "Console error.";
          appendConsoleLine(`[error] ${msg}`);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      consoleOpeningRef.current = false;
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      if (manualCloseRef.current) {
        setConsoleStatus("disconnected");
        return;
      }
      const attempt = (reconnectAttemptsRef.current += 1);
      if (attempt > 15) {
        setConsoleStatus("error");
        appendConsoleLine("[console] Disconnected. Click reconnect to try again.");
        return;
      }
      setConsoleStatus("connecting");
      const baseDelay = 1000 * 2 ** Math.min(attempt - 1, 6);
      const jitter = Math.floor(Math.random() * 400);
      const delay = Math.min(45000, baseDelay + jitter);
      setTimeout(() => {
        if (!manualCloseRef.current && !wsRef.current && !consoleOpeningRef.current) {
          connectConsole();
        }
      }, delay);
    };

    ws.onerror = () => {
      consoleOpeningRef.current = false;
      // Errors are handled by close + reconnect.
    };
  }, [appendConsoleLine, details, orderId]);

  React.useEffect(() => {
    if (activeTab === "console" && orderId && details) {
      connectConsole();
    }
    if (activeTab !== "console" && wsRef.current) {
      manualCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
      consoleOpeningRef.current = false;
      setConsoleStatus("disconnected");
    }
  }, [activeTab, connectConsole, details, orderId]);

  React.useEffect(
    () => () => {
      if (wsRef.current) {
        manualCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
      consoleOpeningRef.current = false;
    },
    []
  );

  // Metrics polling while Metrics tab is active
  React.useEffect(() => {
    if (activeTab !== "metrics" || !orderId) {
      return;
    }

    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const resp = await api.getServerResources(orderId);
        if (!cancelled) {
          setResources(resp as ServerResourcesResponse);
          setMetricsError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load metrics";
        setMetricsError(message);
      }
    };

    fetchOnce();
    const interval = window.setInterval(fetchOnce, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTab, orderId]);

  async function handlePower(action: "start" | "stop" | "restart") {
    if (!orderId || !details) return;
    if (powerLoading) return;

    setPowerLoading(action);
    try {
      await api.http(`/api/servers/${encodeURIComponent(orderId)}/power`, {
        method: "POST",
        body: { action },
      });

      // Best-effort refresh of resources after power action; rely on backend TTL to avoid thrash.
      try {
        const refreshed = await api.getServerResources(orderId);
        setResources(refreshed as ServerResourcesResponse);
      } catch {
        // non-fatal
      }

      toast({
        title: `Power action queued`,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} requested for ${details.server_name || details.game}.`,
      });
    } catch (err: any) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: status === 429 ? "Slow down" : "Power action failed",
        description: status === 429
          ? "Too many power actions in a short time. Wait a moment and try again."
          : message,
        variant: "destructive",
      });
    } finally {
      setPowerLoading(null);
    }
  }

  async function handleSlugAvailabilityCheck(nextSlug?: string) {
    if (!orderId) return;
    const slug = normalizeSlugInput(nextSlug ?? publicForm.public_slug);
    if (!slug) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    try {
      const result = await api.checkPublicSlugAvailability(orderId, slug);
      setSlugStatus(result?.available ? "available" : "taken");
    } catch {
      setSlugStatus("idle");
    }
  }

  async function handleSavePublicPage() {
    if (!orderId) return;
    setPublicPageSaving(true);
    setPublicPageErrors({});

    try {
      const payload = {
        public_page_enabled: publicForm.public_page_enabled,
        public_slug: normalizeSlugInput(publicForm.public_slug),
        streamer_name: publicForm.streamer_name.trim(),
        stream_platform: publicForm.stream_platform,
        stream_channel: publicForm.stream_channel.trim(),
        stream_url: publicForm.stream_url.trim(),
        discord_url: publicForm.discord_url.trim(),
        server_description: publicForm.server_description.trim(),
        kick_embed_enabled: 0,
      };

      const saved = (await api.updateServerPublicPage(orderId, payload)) as PublicPageSettingsResponse;
      setPublicPage(saved);
      setPublicForm(buildPublicForm(saved));
      setSlugStatus(saved.public_slug ? "available" : "idle");
      toast({
        title: "Public page updated",
        description: "Your public streamer server page settings have been saved.",
      });
    } catch (err: any) {
      const fields = err?.fields || err?.response?.data?.fields;
      if (fields && typeof fields === "object") {
        setPublicPageErrors(fields);
      }
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unable to save public page settings.",
        variant: "destructive",
      });
    } finally {
      setPublicPageSaving(false);
    }
  }

  async function handleCopyPublicUrl() {
    if (!publicForm.public_slug || typeof window === "undefined") return;
    const url = `${window.location.origin}/server/${publicForm.public_slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setPublicUrlCopyState("copied");
      toast({
        title: "Public URL copied",
        description: "The public server page link is ready to share.",
      });
    } catch {
      setPublicUrlCopyState("error");
      toast({
        title: "Copy failed",
        description: "Unable to copy the public page URL.",
        variant: "destructive",
      });
    } finally {
      window.setTimeout(() => setPublicUrlCopyState("idle"), 1800);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/55 via-gray-900/35 to-gray-900/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-blue-900/10" />
      </div>

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[15px]">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/dashboard/services"
              className="inline-flex items-center text-base font-medium text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to My Services
            </Link>
          </div>

          {loading ? (
            <div className="text-gray-200 text-base">Loading server…</div>
          ) : error ? (
            <div className="bg-red-950/90 border border-red-500 text-red-100 px-4 py-3 rounded-lg font-medium">
              {error}
            </div>
          ) : !details ? (
            <div className="text-gray-200 text-base">Server not found.</div>
          ) : (
            <>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="text-emerald-400" size={24} />
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {details.server_name || details.game}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-800/80 bg-black/40">
                      <span className="uppercase text-xs font-medium tracking-wide text-gray-400">Game</span>
                      <span className="font-semibold text-white capitalize">{details.game}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-800/80 bg-black/40">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="uppercase text-xs font-medium tracking-wide text-gray-400">Region</span>
                      <span className="font-semibold text-white">{details.region}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-800/80 bg-black/40">
                      <span className="uppercase text-xs font-medium tracking-wide text-gray-400">Status</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          (resources?.state || details.status).toLowerCase().startsWith("online")
                            ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/60"
                            : "bg-amber-500/20 text-amber-200 border-amber-400/50"
                        }`}
                      >
                        {resources?.state || details.status}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[260px]">
                  <div className="bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-2.5 shadow">
                    <div className="flex items-center gap-2 text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">
                      <Cpu size={12} />
                      <span>vCPU</span>
                    </div>
                    <div className="text-base font-semibold text-white">
                      {details.plan.vcores ? `${details.plan.vcores} vCPU` : "Unknown"}
                    </div>
                  </div>
                  <div className="bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-2.5 shadow">
                    <div className="flex items-center gap-2 text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">
                      <HardDrive size={12} />
                      <span>RAM</span>
                    </div>
                    <div className="text-base font-semibold text-white">
                      {details.plan.ram_gb ? `${details.plan.ram_gb} GB` : "Unknown"}
                    </div>
                  </div>
                  <div className="bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-2.5 shadow">
                    <div className="flex items-center gap-2 text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">
                      <HardDrive size={12} />
                      <span>Disk</span>
                    </div>
                    <div className="text-base font-semibold text-white">
                      {details.plan.ssd_gb ? `${details.plan.ssd_gb} GB NVMe` : "Unknown"}
                    </div>
                  </div>
                  <div className="bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 shadow col-span-2 sm:col-span-3">
                    <div className="text-[11px] uppercase font-semibold tracking-wide text-gray-200 mr-1">
                      Power
                    </div>
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <button
                        type="button"
                        onClick={() => handlePower("start")}
                        disabled={!canStart || powerLoading !== null}
                        className="inline-flex items-center h-8 px-3 rounded-md text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Power size={14} className="mr-1.5" />
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePower("stop")}
                        disabled={!canStop || powerLoading !== null}
                        className="inline-flex items-center h-8 px-3 rounded-md text-xs sm:text-sm font-semibold text-white bg-red-600/90 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PowerOff size={14} className="mr-1.5" />
                        Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePower("restart")}
                        disabled={!canRestart || powerLoading !== null}
                        className="inline-flex items-center h-8 px-3 rounded-md text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCcw size={14} className="mr-1.5" />
                        Restart
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 overflow-x-auto">
                <nav className="inline-flex min-w-max space-x-2 rounded-lg border border-gray-800/80 bg-black/40 px-3 py-1 text-sm">
                  {([
                    ["console", "Console"],
                    ["files", "Files"],
                    ["databases", "Databases"],
                    ["schedules", "Schedules"],
                    ["users", "Users"],
                    ["backups", "Backups"],
                    ["network", "Network"],
                    ["startup", "Startup"],
                    ["settings", "Settings"],
                    ["activity", "Activity"],
                    ["overview", "Overview"],
                    ["metrics", "Metrics"],
                  ] as [ServerDetailsTab, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                        activeTab === id
                          ? "border-emerald-400 bg-gray-900 text-white"
                          : "border-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-900/60"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {activeTab === "overview" && (
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-4 shadow">
                      <h2 className="text-lg font-semibold text-white mb-3">Server overview</h2>
                      <p className="text-sm text-gray-200 leading-relaxed mb-3">
                        This view is powered by the new native GIVRwrld control plane. Provisioning still
                        runs through Pterodactyl behind the scenes, but you manage the server from here.
                      </p>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Order ID</dt>
                          <dd className="font-mono font-semibold text-white">{details.id}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Game</dt>
                          <dd className="font-semibold text-white capitalize">{details.game}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Region</dt>
                          <dd className="font-semibold text-white">{details.region}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Hostname</dt>
                          <dd className="font-semibold text-white">
                        {hasPanel && details.panel?.allocations.primaryIp
                              ? details.panel.allocations.primaryIp
                              : "Assigned during provisioning"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Port</dt>
                          <dd className="font-semibold text-white">
                            {hasPanel && details.panel?.allocations.primaryPort
                              ? details.panel.allocations.primaryPort
                              : "Assigned during provisioning"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-900/90 border border-gray-600 rounded-xl p-4 shadow">
                    <h3 className="text-sm font-semibold text-white mb-2">Advanced</h3>
                    <p className="text-xs text-gray-200 leading-relaxed mb-2">
                      Power, console, and metrics are best managed from this Game Panel view. You can still
                      open the legacy Pterodactyl panel for advanced configuration when needed.
                    </p>
                    {panelServerIdentifier ? (
                      <a
                        href={`${String(ENV.PANEL_URL || "").replace(/\/+$/, "")}/server/${encodeURIComponent(panelServerIdentifier)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        <ExternalLink size={12} className="mr-1" />
                        Open Pterodactyl panel
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400">
                        Pterodactyl server identifier not yet available; legacy panel link will appear once
                        provisioning completes.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-4 shadow">
                      <h3 className="text-sm font-semibold text-white mb-3">Live snapshot</h3>
                      {resources ? (
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">CPU</dt>
                            <dd className="font-semibold text-white">
                              {Number(resources.cpu_percent || 0).toFixed(1)}%
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">RAM used</dt>
                            <dd className="font-semibold text-white">
                              {formatBytesToGb(resources.memory_bytes)}{" "}
                              {resources.memory_limit_bytes
                                ? `of ${formatBytesToGb(resources.memory_limit_bytes)}`
                                : ""}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Disk used</dt>
                            <dd className="font-semibold text-white">
                              {formatBytesToGb(resources.disk_bytes)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Players</dt>
                            <dd className="font-semibold text-white">
                              {resources.players_online} / {resources.players_max || 0}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-xs uppercase font-medium tracking-wide text-gray-400">Uptime</dt>
                            <dd className="font-semibold text-white">
                              {formatUptime(resources.uptime_seconds || 0)}
                            </dd>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            Updated {new Date(resources.measured_at).toLocaleTimeString()}
                          </div>
                        </dl>
                      ) : (
                        <p className="text-sm text-gray-200">
                          Live metrics are temporarily unavailable. Try refreshing this page in a few
                          seconds.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "console" && (
                <>
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 bg-gray-950 border border-gray-600 rounded-xl p-4 flex flex-col h-[420px] shadow">
                      <div className="mb-3 flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          Console status:{" "}
                          <span
                            className={`font-semibold ${
                              consoleStatus === "connected"
                                ? "text-emerald-300"
                                : consoleStatus === "connecting"
                                ? "text-amber-300"
                                : consoleStatus === "error"
                                ? "text-red-300"
                                : "text-gray-300"
                            }`}
                          >
                            {consoleStatus}
                          </span>
                        </span>
                        {consoleStatus !== "connected" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!orderId || !details) return;
                              manualCloseRef.current = false;
                              if (wsRef.current) {
                                wsRef.current.close();
                                wsRef.current = null;
                              }
                              consoleOpeningRef.current = false;
                              reconnectAttemptsRef.current = 0;
                              connectConsole();
                            }}
                            className="px-2 py-1 rounded-md border border-gray-500 text-gray-200 hover:bg-gray-700 text-xs font-medium"
                          >
                            Reconnect
                          </button>
                        )}
                      </div>
                      <div className="flex-1 bg-black rounded-md p-3 font-mono text-[13px] text-gray-100 overflow-y-auto mb-3 border border-gray-600 leading-relaxed">
                        {consoleLines.length === 0 ? (
                          <div className="text-gray-400">
                            Console output will appear here once the server starts writing logs.
                          </div>
                        ) : (
                          consoleLines.map((line, idx) => (
                            <div key={idx} className="whitespace-pre-wrap">
                              {line}
                            </div>
                          ))
                        )}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const cmd = consoleInput.trim();
                          if (!cmd || !wsRef.current || consoleStatus !== "connected") return;
                          try {
                            wsRef.current.send(JSON.stringify({ type: "console.command", command: cmd }));
                            setConsoleInput("");
                          } catch {
                            // ignore
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={consoleInput}
                          onChange={(e) => setConsoleInput(e.target.value)}
                          placeholder="Type a command and press Enter"
                          className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={!consoleInput.trim() || consoleStatus !== "connected"}
                          className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      </form>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-3 text-sm shadow">
                        <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Address</div>
                        <div className="font-semibold text-white">
                          {hasPanel && details.panel?.allocations.primaryIp && details.panel.allocations.primaryPort
                            ? `${details.panel.allocations.primaryIp}:${details.panel.allocations.primaryPort}`
                            : "Assigned during provisioning"}
                        </div>
                      </div>
                      <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-3 text-sm shadow">
                        <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Uptime</div>
                        <div className="font-semibold text-white">
                          {resources ? formatUptime(resources.uptime_seconds || 0) : "—"}
                        </div>
                      </div>
                      <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-3 text-sm shadow">
                        <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">CPU Load</div>
                        <div className="font-semibold text-white">
                          {resources ? `${Number(resources.cpu_percent || 0).toFixed(1)}%` : "—"}
                        </div>
                      </div>
                      <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-3 text-sm shadow">
                        <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Memory</div>
                        <div className="font-semibold text-white">
                          {resources
                            ? `${formatBytesToGb(resources.memory_bytes)}${
                                resources.memory_limit_bytes
                                  ? ` of ${formatBytesToGb(resources.memory_limit_bytes)}`
                                  : ""
                              }`
                            : "—"}
                        </div>
                      </div>
                      <div className="bg-gray-900/95 border border-gray-600 rounded-xl p-3 text-sm shadow">
                        <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Disk</div>
                        <div className="font-semibold text-white">
                          {resources ? formatBytesToGb(resources.disk_bytes) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                      <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">CPU Load</div>
                      <div className="text-base font-semibold text-white">
                        {resources ? `${Number(resources.cpu_percent || 0).toFixed(1)}%` : "—"}
                      </div>
                    </div>
                    <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                      <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Memory</div>
                      <div className="text-base font-semibold text-white">
                        {resources
                          ? `${formatBytesToGb(resources.memory_bytes)}${
                              resources.memory_limit_bytes
                                ? ` of ${formatBytesToGb(resources.memory_limit_bytes)}`
                                : ""
                            }`
                          : "—"}
                      </div>
                    </div>
                    <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                      <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Players</div>
                      <div className="text-base font-semibold text-white">
                        {resources ? `${resources.players_online} / ${resources.players_max || 0}` : "—"}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "metrics" && (
                <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
                  <h2 className="text-lg font-semibold text-white mb-4">Live metrics</h2>
                  {metricsError ? (
                    <div className="bg-red-950/90 border border-red-500 text-red-100 px-4 py-3 rounded-lg text-sm font-medium">
                      Metrics temporarily unavailable: {metricsError}
                    </div>
                  ) : !resources ? (
                    <div className="text-sm text-gray-200">Loading metrics…</div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                          <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">CPU usage</div>
                          <div className="text-2xl font-semibold text-white">
                            {Number(resources.cpu_percent || 0).toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                          <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Memory</div>
                          <div className="text-base font-semibold text-white">
                            {formatBytesToGb(resources.memory_bytes)}{" "}
                            {resources.memory_limit_bytes
                              ? `of ${formatBytesToGb(resources.memory_limit_bytes)}`
                              : ""}
                          </div>
                        </div>
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                          <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Disk</div>
                          <div className="text-base font-semibold text-white">
                            {formatBytesToGb(resources.disk_bytes)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                          <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Players</div>
                          <div className="text-base font-semibold text-white">
                            {resources.players_online} / {resources.players_max || 0}
                          </div>
                        </div>
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 shadow">
                          <div className="text-[11px] uppercase font-medium tracking-wide text-gray-400 mb-1">Uptime</div>
                          <div className="text-base font-semibold text-white">
                            {formatUptime(resources.uptime_seconds || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-400">
                        Last updated {new Date(resources.measured_at).toLocaleTimeString()}
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        These metrics are for observability only, updated every few seconds, and are not
                        used for billing.
                      </p>
                    </>
                  )}
                </div>
              )}

              {activeTab === "files" && (
                <PanelTabLoader orderId={orderId!} endpoint="files/list" queryParams={{ directory: "/" }} title="Files">
                  {(data: any) => {
                    const files = data?.data || [];
                    return (
                      <div className="space-y-1">
                        {files.length === 0 && <p className="text-gray-400 text-sm">No files found.</p>}
                        {files.map((f: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-800/60 rounded border border-gray-700/50 text-sm">
                            <span className="text-gray-200">{f.attributes?.is_file === false ? "\u{1F4C1}" : "\u{1F4C4}"} {f.attributes?.name}</span>
                            <span className="text-gray-500 text-xs">
                              {f.attributes?.is_file !== false && f.attributes?.size != null
                                ? `${(f.attributes.size / 1024).toFixed(1)} KB`
                                : f.attributes?.is_file === false ? "dir" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "databases" && (
                <PanelTabLoader orderId={orderId!} endpoint="databases" title="Databases">
                  {(data: any) => {
                    const dbs = data?.data || [];
                    return dbs.length === 0 ? (
                      <p className="text-gray-400 text-sm">No databases created yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {dbs.map((db: any, i: number) => (
                          <div key={i} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                            <div className="font-medium text-white">{db.attributes?.name || "Database"}</div>
                            <div className="text-xs text-gray-400 mt-1">Host: {db.attributes?.host?.address || "N/A"}:{db.attributes?.host?.port || 3306}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "schedules" && (
                <PanelTabLoader orderId={orderId!} endpoint="schedules" title="Schedules">
                  {(data: any) => {
                    const schedules = data?.data || [];
                    return schedules.length === 0 ? (
                      <p className="text-gray-400 text-sm">No schedules configured.</p>
                    ) : (
                      <div className="space-y-3">
                        {schedules.map((s: any, i: number) => (
                          <div key={i} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-white">{s.attributes?.name || "Schedule"}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${s.attributes?.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                {s.attributes?.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "users" && (
                <PanelTabLoader orderId={orderId!} endpoint="users" title="Sub-Users">
                  {(data: any) => {
                    const users = data?.data || [];
                    return users.length === 0 ? (
                      <p className="text-gray-400 text-sm">No sub-users added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {users.map((u: any, i: number) => (
                          <div key={i} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">{u.attributes?.email || "User"}</div>
                              <div className="text-xs text-gray-400 mt-1">{(u.attributes?.permissions || []).length} permissions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "backups" && (
                <PanelTabLoader orderId={orderId!} endpoint="backups" title="Backups">
                  {(data: any) => {
                    const backups = data?.data || [];
                    return backups.length === 0 ? (
                      <p className="text-gray-400 text-sm">No backups yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {backups.map((b: any, i: number) => (
                          <div key={i} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-white">{b.attributes?.name || "Backup"}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${b.attributes?.is_successful ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                {b.attributes?.is_successful ? "Complete" : "In Progress"}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {b.attributes?.bytes != null ? `${(b.attributes.bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                              {b.attributes?.created_at ? ` - ${new Date(b.attributes.created_at).toLocaleString()}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "network" && (
                <PanelTabLoader orderId={orderId!} endpoint="network" title="Network / Allocations">
                  {(data: any) => {
                    const allocs = data?.data || [];
                    return allocs.length === 0 ? (
                      <p className="text-gray-400 text-sm">No network allocations found.</p>
                    ) : (
                      <div className="space-y-2">
                        {allocs.map((a: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                            <span className="text-white font-mono text-sm">{a.attributes?.ip_alias || a.attributes?.ip || "0.0.0.0"}:{a.attributes?.port}</span>
                            {a.attributes?.is_default && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Primary</span>}
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "startup" && (
                <PanelTabLoader orderId={orderId!} endpoint="startup" title="Startup Configuration">
                  {(data: any) => {
                    const vars = data?.data || [];
                    const startup = data?.meta?.startup_command || "";
                    const dockerImg = data?.meta?.docker_image || "";
                    return (
                      <div className="space-y-4">
                        {startup && (
                          <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                            <div className="text-xs text-gray-400 mb-1">Startup Command</div>
                            <code className="text-sm text-emerald-300 break-all">{startup}</code>
                          </div>
                        )}
                        {dockerImg && (
                          <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                            <div className="text-xs text-gray-400 mb-1">Docker Image</div>
                            <code className="text-sm text-blue-300 break-all">{dockerImg}</code>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400 uppercase tracking-wide">Environment Variables</div>
                          {vars.length === 0 && <p className="text-gray-500 text-sm">No startup variables.</p>}
                          {vars.map((v: any, i: number) => (
                            <div key={i} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">{v.attributes?.name || v.attributes?.env_variable}</span>
                                <span className="text-xs text-gray-500 font-mono">{v.attributes?.env_variable}</span>
                              </div>
                              <div className="mt-1 text-sm text-emerald-300 font-mono">{v.attributes?.server_value ?? v.attributes?.default_value ?? ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                </PanelTabLoader>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
                    <h2 className="text-lg font-semibold text-white mb-2">Public Page</h2>
                    <p className="text-sm text-gray-200 leading-relaxed">
                      Create a public page for this server at <span className="font-semibold text-white">/server/:slug</span>
                      with your stream, Discord link, and server details.
                    </p>
                  </div>

                  <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
                    {publicPageLoading ? (
                      <div className="text-sm text-gray-200">Loading public page settings...</div>
                    ) : publicPage && !publicPage.eligible ? (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                        This server is not currently eligible for a public page.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-white">Enable public page</div>
                            <div className="text-xs text-gray-400">
                              Turn on a shareable public page for this server.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPublicForm((prev) => ({
                                ...prev,
                                public_page_enabled: !prev.public_page_enabled,
                              }))
                            }
                            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${
                              publicForm.public_page_enabled
                                ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                                : "border-gray-600 bg-gray-800 text-gray-300"
                            }`}
                          >
                            {publicForm.public_page_enabled ? "Enabled" : "Disabled"}
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                              Public slug
                            </label>
                            <input
                              type="text"
                              value={publicForm.public_slug}
                              onChange={(e) => {
                                const next = normalizeSlugInput(e.target.value);
                                setPublicForm((prev) => ({ ...prev, public_slug: next }));
                                setPublicPageErrors((prev) => ({ ...prev, public_slug: "" }));
                                setSlugStatus("idle");
                              }}
                              onBlur={() => handleSlugAvailabilityCheck()}
                              placeholder="cjn-enshrouded"
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <div className="mt-2 text-xs text-gray-400">
                              Public URL:{" "}
                              <span className="text-gray-200">
                                {typeof window !== "undefined"
                                  ? `${window.location.origin}/server/${publicForm.public_slug || "your-slug"}`
                                  : `/server/${publicForm.public_slug || "your-slug"}`}
                              </span>
                            </div>
                            {slugStatus === "checking" && (
                              <div className="mt-1 text-xs text-gray-400">Checking slug availability...</div>
                            )}
                            {slugStatus === "available" && !publicPageErrors.public_slug && (
                              <div className="mt-1 text-xs text-emerald-300">Slug is available.</div>
                            )}
                            {slugStatus === "taken" && (
                              <div className="mt-1 text-xs text-red-300">That slug is already taken.</div>
                            )}
                            {publicPageErrors.public_slug && (
                              <div className="mt-1 text-xs text-red-300">{publicPageErrors.public_slug}</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                              Streamer name
                            </label>
                            <input
                              type="text"
                              value={publicForm.streamer_name}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPublicForm((prev) => ({ ...prev, streamer_name: value }));
                                setPublicPageErrors((prev) => ({ ...prev, streamer_name: "" }));
                              }}
                              placeholder="CJN"
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {publicPageErrors.streamer_name && (
                              <div className="mt-1 text-xs text-red-300">{publicPageErrors.streamer_name}</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                              Stream platform
                            </label>
                            <select
                              value={publicForm.stream_platform}
                              onChange={(e) => {
                                const value = e.target.value as "twitch" | "kick";
                                setPublicForm((prev) => ({ ...prev, stream_platform: value }));
                                setPublicPageErrors((prev) => ({
                                  ...prev,
                                  stream_platform: "",
                                  stream_url: "",
                                  stream_channel: "",
                                }));
                              }}
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="twitch">Twitch</option>
                              <option value="kick">Kick</option>
                            </select>
                            {publicPageErrors.stream_platform && (
                              <div className="mt-1 text-xs text-red-300">{publicPageErrors.stream_platform}</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                              Stream channel
                            </label>
                            <input
                              type="text"
                              value={publicForm.stream_channel}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPublicForm((prev) => ({ ...prev, stream_channel: value }));
                                setPublicPageErrors((prev) => ({ ...prev, stream_channel: "" }));
                              }}
                              placeholder={publicForm.stream_platform === "kick" ? "cjnlive" : "cjn_live"}
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {publicPageErrors.stream_channel && (
                              <div className="mt-1 text-xs text-red-300">{publicPageErrors.stream_channel}</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                              Stream URL
                            </label>
                            <input
                              type="url"
                              value={publicForm.stream_url}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPublicForm((prev) => ({ ...prev, stream_url: value }));
                                setPublicPageErrors((prev) => ({ ...prev, stream_url: "" }));
                              }}
                              placeholder={publicForm.stream_platform === "kick" ? "https://kick.com/cjnlive" : "https://www.twitch.tv/cjn_live"}
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {publicPageErrors.stream_url && (
                              <div className="mt-1 text-xs text-red-300">{publicPageErrors.stream_url}</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                              Discord URL
                            </label>
                            <input
                              type="url"
                              value={publicForm.discord_url}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPublicForm((prev) => ({ ...prev, discord_url: value }));
                                setPublicPageErrors((prev) => ({ ...prev, discord_url: "" }));
                              }}
                              placeholder="https://discord.gg/your-community"
                              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {publicPageErrors.discord_url && (
                              <div className="mt-1 text-xs text-red-300">{publicPageErrors.discord_url}</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                            Server description
                          </label>
                          <textarea
                            value={publicForm.server_description}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPublicForm((prev) => ({ ...prev, server_description: value }));
                              setPublicPageErrors((prev) => ({ ...prev, server_description: "" }));
                            }}
                            rows={5}
                            placeholder="Tell visitors what this server is about, who it is for, and what makes it worth joining."
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                          />
                          {publicPageErrors.server_description && (
                            <div className="mt-1 text-xs text-red-300">{publicPageErrors.server_description}</div>
                          )}
                        </div>

                        <div className="rounded-lg border border-gray-700/60 bg-black/25 p-4">
                          <div className="text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">
                            Platform behavior
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            Twitch pages render an embedded player on the public page. Kick is supported in the
                            data model and public page UX, but v1 uses a channel card with an external watch link.
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleSavePublicPage}
                            disabled={publicPageSaving || (publicPage?.eligible === false)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold transition-colors min-w-[170px]"
                          >
                            {publicPageSaving && (
                              <Loader2 size={16} className="animate-spin" />
                            )}
                            <span>Save public page</span>
                          </button>
                          {publicForm.public_page_enabled && publicForm.public_slug && (
                            <>
                              <button
                                type="button"
                                onClick={handleCopyPublicUrl}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium text-gray-200 hover:text-white hover:border-gray-500 transition-colors"
                              >
                                <ExternalLink size={14} />
                                {publicUrlCopyState === "copied"
                                  ? "Copied link"
                                  : publicUrlCopyState === "error"
                                  ? "Copy failed"
                                  : "Copy public URL"}
                              </button>
                              <Link
                                to={`/server/${publicForm.public_slug}`}
                                state={{ from: "dashboard-server", orderId }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium text-gray-200 hover:text-white hover:border-gray-500 transition-colors"
                              >
                                <ExternalLink size={14} />
                                Open public page
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
                  <h2 className="text-lg font-semibold text-white mb-2">Activity</h2>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    A chronological view of server actions (power changes, backups, errors) will land here so
                    you can audit what happened over time.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardServerDetails;


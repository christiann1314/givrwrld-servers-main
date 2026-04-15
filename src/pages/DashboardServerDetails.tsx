import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Server, Cpu, HardDrive, MapPin, Power, PowerOff, RefreshCcw, ExternalLink, Loader2 } from "lucide-react";
import api, { getApiBase } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { getAccessToken } from "@/lib/auth";
import { ENV } from "@/config/env";
import FilesTab from "@/components/server-tabs/FilesTab";
import DatabasesTab from "@/components/server-tabs/DatabasesTab";
import BackupsTab from "@/components/server-tabs/BackupsTab";
import SchedulesTab from "@/components/server-tabs/SchedulesTab";
import UsersTab from "@/components/server-tabs/UsersTab";
import NetworkTab from "@/components/server-tabs/NetworkTab";
import StartupTab from "@/components/server-tabs/StartupTab";
import SettingsTab from "@/components/server-tabs/SettingsTab";
import ActivityTab from "@/components/server-tabs/ActivityTab";

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

/* PublicPageSettingsResponse and PublicPageFormState moved to SettingsTab component */

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

/* normalizeSlugInput and buildPublicForm moved to SettingsTab component */

/* PanelTabLoader removed — each tab now uses its own panelApi calls via dedicated components */

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
        setError(null);

        const [server, live] = await Promise.allSettled([
          api.getServer(orderId),
          api.getServerResources(orderId),
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
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load server");
      } finally {
        if (!cancelled) {
          setLoading(false);
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

  /* Public page handlers moved to SettingsTab component */

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

              {activeTab === "files" && <FilesTab orderId={orderId!} />}
              {activeTab === "databases" && <DatabasesTab orderId={orderId!} />}
              {activeTab === "schedules" && <SchedulesTab orderId={orderId!} />}
              {activeTab === "users" && <UsersTab orderId={orderId!} />}
              {activeTab === "backups" && <BackupsTab orderId={orderId!} />}
              {activeTab === "network" && <NetworkTab orderId={orderId!} />}
              {activeTab === "startup" && <StartupTab orderId={orderId!} />}
              {activeTab === "settings" && (
                <SettingsTab
                  orderId={orderId!}
                  serverName={details?.server_name}
                  panelIdentifier={panelServerIdentifier}
                />
              )}
              {activeTab === "activity" && <ActivityTab orderId={orderId!} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardServerDetails;


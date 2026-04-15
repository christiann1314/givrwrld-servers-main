import * as React from "react";
import { Link } from "react-router-dom";
import { Settings, Server, RotateCcw, ExternalLink, Loader2, Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { panelFetch } from "@/lib/panelApi";
import api, { getApiBase } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

interface Props {
  orderId: string;
  serverName?: string;
  panelIdentifier?: string | null;
}

function normalizeSlugInput(value: string): string {
  return String(value || "")
    .toLowerCase().trim()
    .replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function SettingsTab({ orderId, serverName, panelIdentifier }: Props) {
  /* ── SFTP ────────────────────── */
  const [sftpDetails, setSftpDetails] = React.useState<any>(null);
  const [sftpLoading, setSftpLoading] = React.useState(true);
  const [showSftpPass, setShowSftpPass] = React.useState(false);

  /* ── Rename ──────────────────── */
  const [newName, setNewName] = React.useState(serverName || "");
  const [renaming, setRenaming] = React.useState(false);

  /* ── Reinstall ───────────────── */
  const [showReinstall, setShowReinstall] = React.useState(false);
  const [reinstalling, setReinstalling] = React.useState(false);

  /* ── Public Page ─────────────── */
  const [publicPage, setPublicPage] = React.useState<any>(null);
  const [publicForm, setPublicForm] = React.useState({
    public_page_enabled: false, public_slug: "", streamer_name: "",
    stream_platform: "twitch" as "twitch"|"kick", stream_channel: "",
    stream_url: "", discord_url: "", server_description: "",
  });
  const [ppLoading, setPpLoading] = React.useState(true);
  const [ppSaving, setPpSaving] = React.useState(false);
  const [ppErrors, setPpErrors] = React.useState<Record<string,string>>({});
  const [slugStatus, setSlugStatus] = React.useState<"idle"|"checking"|"available"|"taken">("idle");

  React.useEffect(() => {
    let c = false;
    (async () => {
      try {
        const base = getApiBase().replace(/\/+$/, "");
        const token = getAccessToken();
        const res = await fetch(`${base}/api/panel/${orderId}/details`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!c && res.ok) {
          const j = await res.json();
          setSftpDetails(j?.attributes?.sftp_details || j?.sftp_details || null);
        }
      } catch { /* sftp details optional */ }
      finally { if (!c) setSftpLoading(false); }
    })();
    (async () => {
      try {
        const pp = await api.getServerPublicPage(orderId);
        if (!c) {
          setPublicPage(pp);
          const s = pp as any;
          setPublicForm({
            public_page_enabled: Number(s?.public_page_enabled || 0) === 1,
            public_slug: s?.public_slug || "", streamer_name: s?.streamer_name || "",
            stream_platform: s?.stream_platform || "twitch", stream_channel: s?.stream_channel || "",
            stream_url: s?.stream_url || "", discord_url: s?.discord_url || "",
            server_description: s?.server_description || "",
          });
        }
      } catch { /* public page optional */ }
      finally { if (!c) setPpLoading(false); }
    })();
    return () => { c = true; };
  }, [orderId]);

  async function handleRename() {
    if (!newName.trim()) return;
    setRenaming(true);
    try {
      await panelFetch(orderId, "settings/rename", { method: "POST", body: { name: newName.trim() } });
      toast({ title: "Server renamed", description: newName.trim() });
    } catch (e: any) { toast({ title: "Rename failed", description: e?.message, variant: "destructive" }); }
    finally { setRenaming(false); }
  }

  async function handleReinstall() {
    setReinstalling(true);
    try {
      await panelFetch(orderId, "settings/reinstall", { method: "POST" });
      toast({ title: "Reinstall started", description: "The server is being reinstalled. This may take a few minutes." });
      setShowReinstall(false);
    } catch (e: any) { toast({ title: "Reinstall failed", description: e?.message, variant: "destructive" }); }
    finally { setReinstalling(false); }
  }

  async function checkSlug(nextSlug?: string) {
    const slug = normalizeSlugInput(nextSlug ?? publicForm.public_slug);
    if (!slug) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    try {
      const r = await api.checkPublicSlugAvailability(orderId, slug);
      setSlugStatus((r as any)?.available ? "available" : "taken");
    } catch { setSlugStatus("idle"); }
  }

  async function handleSavePublicPage() {
    setPpSaving(true); setPpErrors({});
    try {
      let channel = publicForm.stream_channel.trim();
      let url = publicForm.stream_url.trim();
      const platform = publicForm.stream_platform;
      if (channel && !url) url = platform === "twitch" ? `https://www.twitch.tv/${channel}` : `https://kick.com/${channel}`;
      else if (url && !channel) {
        const m = platform === "twitch" ? url.match(/twitch\.tv\/([^/?#]+)/i) : url.match(/kick\.com\/([^/?#]+)/i);
        if (m) channel = m[1];
      }
      const payload = {
        public_page_enabled: publicForm.public_page_enabled,
        public_slug: normalizeSlugInput(publicForm.public_slug),
        streamer_name: publicForm.streamer_name.trim(),
        stream_platform: platform, stream_channel: channel, stream_url: url,
        discord_url: publicForm.discord_url.trim(),
        server_description: publicForm.server_description.trim(),
        kick_embed_enabled: 0,
      };
      const saved = await api.updateServerPublicPage(orderId, payload) as any;
      setPublicPage(saved);
      setPublicForm({
        public_page_enabled: Number(saved?.public_page_enabled || 0) === 1,
        public_slug: saved?.public_slug || "", streamer_name: saved?.streamer_name || "",
        stream_platform: saved?.stream_platform || "twitch", stream_channel: saved?.stream_channel || "",
        stream_url: saved?.stream_url || "", discord_url: saved?.discord_url || "",
        server_description: saved?.server_description || "",
      });
      setSlugStatus(saved.public_slug ? "available" : "idle");
      toast({ title: "Public page updated" });
    } catch (e: any) {
      const fields = (e as any)?.fields || (e as any)?.response?.data?.fields;
      if (fields && typeof fields === "object") setPpErrors(fields);
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally { setPpSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* ── SFTP Details ──────────────────── */}
      <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Server size={18} /> SFTP Details</h2>
        {sftpLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>
        ) : sftpDetails ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Server Address</label>
              <div className="flex items-center gap-2">
                <code className="text-sm text-emerald-300 font-mono bg-gray-800 px-3 py-1.5 rounded flex-1">{sftpDetails.ip || "N/A"}:{sftpDetails.port || 2022}</code>
                <button onClick={() => { navigator.clipboard.writeText(`${sftpDetails.ip}:${sftpDetails.port || 2022}`); toast({ title: "Copied" }); }} className="p-1 rounded hover:bg-gray-700 text-gray-400"><Copy size={14} /></button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Username</label>
              <div className="flex items-center gap-2">
                <code className="text-sm text-emerald-300 font-mono bg-gray-800 px-3 py-1.5 rounded flex-1">{panelIdentifier ? `${panelIdentifier}` : "Loading..."}</code>
                {panelIdentifier && <button onClick={() => { navigator.clipboard.writeText(panelIdentifier); toast({ title: "Copied" }); }} className="p-1 rounded hover:bg-gray-700 text-gray-400"><Copy size={14} /></button>}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-400">Use the same password as your Pterodactyl panel account to connect via SFTP.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">SFTP details are not available. The server may still be provisioning.</p>
        )}
      </div>

      {/* ── Rename Server ─────────────────── */}
      <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Settings size={18} /> Server Name</h2>
        <div className="flex items-center gap-3">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRename()} placeholder="Server name" className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={handleRename} disabled={renaming || !newName.trim() || newName === serverName} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">
            {renaming ? <Loader2 size={14} className="animate-spin" /> : "Save"}
          </button>
        </div>
      </div>

      {/* ── Reinstall Server ──────────────── */}
      <div className="bg-gray-900/90 border border-red-800/40 rounded-xl p-6 shadow">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><RotateCcw size={18} /> Reinstall Server</h2>
        <p className="text-sm text-gray-300 mb-4">This will reinstall your server from scratch. All files will be deleted and the server will be set up fresh.</p>
        {showReinstall ? (
          <div className="p-4 bg-red-950/40 rounded-lg border border-red-700/50 space-y-3">
            <div className="flex items-center gap-2 text-red-300">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">Are you sure? This action is irreversible.</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReinstall} disabled={reinstalling} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                {reinstalling ? <Loader2 size={14} className="animate-spin" /> : "Confirm Reinstall"}
              </button>
              <button onClick={() => setShowReinstall(false)} className="px-4 py-2 rounded-md border border-gray-600 text-gray-300 text-sm font-medium">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowReinstall(true)} className="px-4 py-2 rounded-md border border-red-700/60 text-red-400 hover:bg-red-950/40 text-sm font-medium">
            Reinstall Server
          </button>
        )}
      </div>

      {/* ── Public Page ───────────────────── */}
      <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
        <h2 className="text-lg font-semibold text-white mb-2">Public Page</h2>
        <p className="text-sm text-gray-200 leading-relaxed mb-4">
          Create a public page at <span className="font-semibold text-white">/server/:slug</span> with your stream, Discord link, and server details.
        </p>

        {ppLoading ? (
          <div className="text-sm text-gray-200 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</div>
        ) : publicPage && !(publicPage as any).eligible ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            This server is not currently eligible for a public page.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Enable public page</div>
                <div className="text-xs text-gray-400">Turn on a shareable public page for this server.</div>
              </div>
              <button onClick={() => setPublicForm(p => ({...p, public_page_enabled: !p.public_page_enabled}))}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${publicForm.public_page_enabled ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-gray-600 bg-gray-800 text-gray-300"}`}>
                {publicForm.public_page_enabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Public slug</label>
                <input type="text" value={publicForm.public_slug} onChange={e => { const v = normalizeSlugInput(e.target.value); setPublicForm(p => ({...p, public_slug: v})); setPpErrors(p => ({...p, public_slug: ""})); setSlugStatus("idle"); }} onBlur={() => checkSlug()} placeholder="my-server" className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <div className="mt-1 text-xs text-gray-400">URL: <span className="text-gray-200">{typeof window !== "undefined" ? `${window.location.origin}/server/${publicForm.public_slug || "your-slug"}` : `/server/${publicForm.public_slug || "your-slug"}`}</span></div>
                {slugStatus === "checking" && <div className="mt-1 text-xs text-gray-400">Checking...</div>}
                {slugStatus === "available" && !ppErrors.public_slug && <div className="mt-1 text-xs text-emerald-300">Available</div>}
                {slugStatus === "taken" && <div className="mt-1 text-xs text-red-300">Taken</div>}
                {ppErrors.public_slug && <div className="mt-1 text-xs text-red-300">{ppErrors.public_slug}</div>}
              </div>
              <div>
                <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Streamer name</label>
                <input type="text" value={publicForm.streamer_name} onChange={e => setPublicForm(p => ({...p, streamer_name: e.target.value}))} placeholder="CJN" className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Platform</label>
                <select value={publicForm.stream_platform} onChange={e => setPublicForm(p => ({...p, stream_platform: e.target.value as any}))} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="twitch">Twitch</option>
                  <option value="kick">Kick</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Channel</label>
                <input type="text" value={publicForm.stream_channel} onChange={e => setPublicForm(p => ({...p, stream_channel: e.target.value}))} placeholder={publicForm.stream_platform === "kick" ? "cjnlive" : "cjn_live"} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Stream URL</label>
                <input type="url" value={publicForm.stream_url} onChange={e => setPublicForm(p => ({...p, stream_url: e.target.value}))} placeholder={publicForm.stream_platform === "kick" ? "https://kick.com/cjnlive" : "https://www.twitch.tv/cjn_live"} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Discord URL</label>
                <input type="url" value={publicForm.discord_url} onChange={e => setPublicForm(p => ({...p, discord_url: e.target.value}))} placeholder="https://discord.gg/your-community" className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-medium tracking-wide text-gray-400 mb-2">Server description</label>
              <textarea value={publicForm.server_description} onChange={e => setPublicForm(p => ({...p, server_description: e.target.value}))} rows={4} placeholder="Tell visitors what this server is about." className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y" />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleSavePublicPage} disabled={ppSaving} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold transition-colors min-w-[170px]">
                {ppSaving && <Loader2 size={16} className="animate-spin" />}
                Save public page
              </button>
              {publicForm.public_page_enabled && publicForm.public_slug && (
                <>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/server/${publicForm.public_slug}`); toast({ title: "Copied" }); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium text-gray-200 hover:text-white hover:border-gray-500">
                    <ExternalLink size={14} /> Copy URL
                  </button>
                  <Link to={`/server/${publicForm.public_slug}`} state={{ from: "dashboard-server", orderId }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium text-gray-200 hover:text-white hover:border-gray-500">
                    <ExternalLink size={14} /> Open
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

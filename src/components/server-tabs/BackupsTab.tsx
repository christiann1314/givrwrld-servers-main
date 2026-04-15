import * as React from "react";
import { Archive, Plus, Download, RotateCcw, Trash2, X, Loader2, RefreshCcw, CheckCircle2, Clock } from "lucide-react";
import { panelFetch, panelDelete } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface BackupItem {
  object: string;
  attributes: {
    uuid: string;
    name: string;
    ignored_files: string[];
    bytes: number;
    checksum: string | null;
    is_successful: boolean;
    is_locked: boolean;
    created_at: string;
    completed_at: string | null;
  };
}

interface Props {
  orderId: string;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function BackupsTab({ orderId }: Props) {
  const [backups, setBackups] = React.useState<BackupItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createIgnored, setCreateIgnored] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const fetchBackups = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await panelFetch(orderId, "backups");
      setBackups(data?.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load backups");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function handleCreate() {
    setCreating(true);
    try {
      const body: any = {};
      if (createName.trim()) body.name = createName.trim();
      if (createIgnored.trim()) body.ignored = createIgnored.trim();
      await panelFetch(orderId, "backups", { method: "POST", body });
      toast({ title: "Backup started", description: "Your backup is being created." });
      setShowCreate(false);
      setCreateName("");
      setCreateIgnored("");
      fetchBackups();
    } catch (err: any) {
      toast({ title: "Backup failed", description: err?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDownload(uuid: string) {
    try {
      const data = await panelFetch(orderId, `backups/${uuid}/download`);
      const url = data?.attributes?.url || data?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        toast({ title: "Download failed", description: "Could not get download URL", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Download failed", description: err?.message, variant: "destructive" });
    }
  }

  async function handleRestore(uuid: string) {
    setRestoringId(uuid);
    try {
      await panelFetch(orderId, `backups/${uuid}/restore`, {
        method: "POST",
        body: { truncate: false },
      });
      toast({ title: "Restore started", description: "The backup is being restored to the server." });
    } catch (err: any) {
      toast({ title: "Restore failed", description: err?.message, variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await panelDelete(orderId, `backups/${deletingId}`);
      toast({ title: "Backup deleted" });
      setDeletingId(null);
      fetchBackups();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Backups</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            <Plus size={14} />
            Create Backup
          </button>
          <button
            onClick={fetchBackups}
            className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-gray-800/60 rounded-lg border border-gray-700/50 space-y-3">
          <div className="text-sm font-medium text-white">New Backup</div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Backup Name (optional)</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Auto-generated if empty"
              autoFocus
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ignored Files (optional)</label>
            <input
              type="text"
              value={createIgnored}
              onChange={(e) => setCreateIgnored(e.target.value)}
              placeholder="*.log, node_modules"
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : "Start Backup"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateName(""); setCreateIgnored(""); }}
              className="px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-950/40 rounded-lg border border-red-700/50">
          <Trash2 size={16} className="text-red-400" />
          <span className="text-sm text-gray-200 flex-1">Delete this backup? This cannot be undone.</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
          </button>
          <button onClick={() => setDeletingId(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading backups...
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : backups.length === 0 ? (
        <p className="text-gray-400 text-sm">No backups yet.</p>
      ) : (
        <div className="space-y-3">
          {backups.map((b) => {
            const a = b.attributes;
            return (
              <div key={a.uuid} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-blue-400" />
                    <span className="font-medium text-white">{a.name || "Backup"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.is_successful ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {a.is_successful ? (
                        <span className="inline-flex items-center gap-1"><CheckCircle2 size={10} /> Complete</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Clock size={10} /> In Progress</span>
                      )}
                    </span>
                    {a.is_locked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/40 text-gray-400">Locked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {a.is_successful && (
                      <>
                        <button
                          onClick={() => handleDownload(a.uuid)}
                          title="Download"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-blue-400 hover:bg-gray-700"
                        >
                          <Download size={12} /> Download
                        </button>
                        <button
                          onClick={() => handleRestore(a.uuid)}
                          disabled={restoringId === a.uuid}
                          title="Restore"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-amber-400 hover:bg-gray-700 disabled:opacity-50"
                        >
                          {restoringId === a.uuid ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Restore
                        </button>
                      </>
                    )}
                    {!a.is_locked && (
                      <button
                        onClick={() => setDeletingId(a.uuid)}
                        title="Delete"
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{formatSize(a.bytes)}</span>
                  {a.created_at && <span>{new Date(a.created_at).toLocaleString()}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

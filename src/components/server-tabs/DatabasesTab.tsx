import * as React from "react";
import { Database, Plus, Trash2, RefreshCcw, Key, X, Loader2, Copy, Eye, EyeOff } from "lucide-react";
import { panelFetch, panelDelete } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface Props {
  orderId: string;
}

export default function DatabasesTab({ orderId }: Props) {
  const [databases, setDatabases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createRemote, setCreateRemote] = React.useState("%");
  const [creating, setCreating] = React.useState(false);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [rotatingId, setRotatingId] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const fetchDatabases = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await panelFetch(orderId, "databases");
      setDatabases(data?.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load databases");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => { fetchDatabases(); }, [fetchDatabases]);

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      await panelFetch(orderId, "databases", {
        method: "POST",
        body: { database: createName.trim(), remote: createRemote.trim() || "%" },
      });
      toast({ title: "Database created", description: createName.trim() });
      setCreateName("");
      setCreateRemote("%");
      setShowCreate(false);
      fetchDatabases();
    } catch (err: any) {
      toast({ title: "Create failed", description: err?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await panelDelete(orderId, `databases/${deletingId}`);
      toast({ title: "Database deleted" });
      setDeletingId(null);
      fetchDatabases();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleRotatePassword(dbId: string) {
    setRotatingId(dbId);
    try {
      const result = await panelFetch(orderId, `databases/${dbId}/rotate-password`, { method: "POST" });
      const pw = result?.attributes?.relationships?.password?.attributes?.password;
      if (pw) {
        setNewPassword(pw);
        setShowPassword(true);
      }
      toast({ title: "Password rotated" });
      fetchDatabases();
    } catch (err: any) {
      toast({ title: "Rotate failed", description: err?.message, variant: "destructive" });
    } finally {
      setRotatingId(null);
    }
  }

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Databases</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
            <Plus size={14} /> New Database
          </button>
          <button onClick={fetchDatabases} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800">
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-gray-800/60 rounded-lg border border-gray-700/50 space-y-3">
          <div className="text-sm font-medium text-white">Create Database</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Database Name</label>
              <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="my_database" autoFocus className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Connections From</label>
              <input type="text" value={createRemote} onChange={(e) => setCreateRemote(e.target.value)} placeholder="%" className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <p className="text-xs text-gray-500 mt-1">Use % for any host</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} disabled={creating || !createName.trim()} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">
              {creating ? <Loader2 size={14} className="animate-spin" /> : "Create Database"}
            </button>
            <button onClick={() => { setShowCreate(false); setCreateName(""); setCreateRemote("%"); }} className="px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 hover:text-white text-xs font-medium">Cancel</button>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-950/40 rounded-lg border border-red-700/50">
          <Trash2 size={16} className="text-red-400" />
          <span className="text-sm text-gray-200 flex-1">Delete this database? All data will be permanently lost.</span>
          <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
          </button>
          <button onClick={() => setDeletingId(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={16} /></button>
        </div>
      )}

      {newPassword && (
        <div className="mb-4 p-3 bg-emerald-950/30 rounded-lg border border-emerald-700/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-400 font-medium">New Password</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded hover:bg-gray-700 text-gray-400">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(newPassword); toast({ title: "Password copied" }); }} className="p-1 rounded hover:bg-gray-700 text-gray-400">
                <Copy size={14} />
              </button>
              <button onClick={() => setNewPassword(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={14} /></button>
            </div>
          </div>
          <code className="text-sm text-emerald-300 font-mono">{showPassword ? newPassword : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}</code>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Loading databases...</div>
      ) : error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : databases.length === 0 ? (
        <p className="text-gray-400 text-sm">No databases created yet.</p>
      ) : (
        <div className="space-y-3">
          {databases.map((db: any) => {
            const a = db.attributes;
            return (
              <div key={a.id} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-blue-400" />
                    <span className="font-medium text-white">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleRotatePassword(a.id)} disabled={rotatingId === a.id} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-amber-400 hover:bg-gray-700 disabled:opacity-50">
                      {rotatingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />} Rotate
                    </button>
                    <button onClick={() => setDeletingId(a.id)} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-400">
                  <div><span className="text-gray-500">Username:</span> <span className="text-gray-200 font-mono">{a.username}</span></div>
                  <div><span className="text-gray-500">Host:</span> <span className="text-gray-200 font-mono">{a.host?.address || "N/A"}:{a.host?.port || 3306}</span></div>
                  <div><span className="text-gray-500">Connections:</span> <span className="text-gray-200">{a.connections_from || a.remote || "%"}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

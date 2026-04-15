import * as React from "react";
import { Users, Plus, Trash2, X, Loader2, RefreshCcw, Pencil, Shield } from "lucide-react";
import { panelFetch, panelDelete } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface Props { orderId: string; }

const ALL_PERMISSIONS = [
  { key: "control.console", label: "Console" },
  { key: "control.start", label: "Start" },
  { key: "control.stop", label: "Stop" },
  { key: "control.restart", label: "Restart" },
  { key: "file.read", label: "Read Files" },
  { key: "file.read-content", label: "Read File Content" },
  { key: "file.create", label: "Create Files" },
  { key: "file.update", label: "Update Files" },
  { key: "file.delete", label: "Delete Files" },
  { key: "file.archive", label: "Archive Files" },
  { key: "file.sftp", label: "SFTP" },
  { key: "backup.create", label: "Create Backups" },
  { key: "backup.read", label: "Read Backups" },
  { key: "backup.delete", label: "Delete Backups" },
  { key: "backup.download", label: "Download Backups" },
  { key: "backup.restore", label: "Restore Backups" },
  { key: "database.create", label: "Create Databases" },
  { key: "database.read", label: "Read Databases" },
  { key: "database.update", label: "Update Databases" },
  { key: "database.delete", label: "Delete Databases" },
  { key: "database.view_password", label: "View DB Passwords" },
  { key: "schedule.create", label: "Create Schedules" },
  { key: "schedule.read", label: "Read Schedules" },
  { key: "schedule.update", label: "Update Schedules" },
  { key: "schedule.delete", label: "Delete Schedules" },
  { key: "allocation.read", label: "Read Allocations" },
  { key: "allocation.update", label: "Update Allocations" },
  { key: "startup.read", label: "Read Startup" },
  { key: "startup.update", label: "Update Startup" },
  { key: "settings.rename", label: "Rename Server" },
  { key: "settings.reinstall", label: "Reinstall Server" },
  { key: "activity.read", label: "Read Activity" },
];

export default function UsersTab({ orderId }: Props) {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createEmail, setCreateEmail] = React.useState("");
  const [createPerms, setCreatePerms] = React.useState<string[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string|null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string|null>(null);
  const [editPerms, setEditPerms] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState(false);

  const fetch_ = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await panelFetch(orderId, "users"); setUsers(d?.data || []); }
    catch (e: any) { setError(e?.message || "Failed to load users"); }
    finally { setLoading(false); }
  }, [orderId]);

  React.useEffect(() => { fetch_(); }, [fetch_]);

  function togglePerm(perms: string[], key: string): string[] {
    return perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key];
  }

  async function handleCreate() {
    if (!createEmail.trim()) return;
    setCreating(true);
    try {
      await panelFetch(orderId, "users", { method: "POST", body: { email: createEmail.trim(), permissions: createPerms } });
      toast({ title: "Sub-user invited", description: createEmail.trim() });
      setCreateEmail(""); setCreatePerms([]); setShowCreate(false);
      fetch_();
    } catch (e: any) { toast({ title: "Invite failed", description: e?.message, variant: "destructive" }); }
    finally { setCreating(false); }
  }

  async function handleEdit() {
    if (!editingId) return;
    setEditing(true);
    try {
      await panelFetch(orderId, `users/${editingId}`, { method: "POST", body: { permissions: editPerms } });
      toast({ title: "Permissions updated" });
      setEditingId(null); setEditPerms([]);
      fetch_();
    } catch (e: any) { toast({ title: "Update failed", description: e?.message, variant: "destructive" }); }
    finally { setEditing(false); }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await panelDelete(orderId, `users/${deletingId}`);
      toast({ title: "Sub-user removed" });
      setDeletingId(null);
      fetch_();
    } catch (e: any) { toast({ title: "Remove failed", description: e?.message, variant: "destructive" }); }
    finally { setDeleting(false); }
  }

  function renderPermGrid(perms: string[], setPerms: (p: string[]) => void) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-2 bg-gray-900/60 rounded border border-gray-700/50">
        {ALL_PERMISSIONS.map(p => (
          <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer hover:text-white py-0.5">
            <input type="checkbox" checked={perms.includes(p.key)} onChange={() => setPerms(togglePerm(perms, p.key))} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 h-3 w-3" />
            {p.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Sub-Users</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"><Plus size={14} /> Add User</button>
          <button onClick={fetch_} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"><RefreshCcw size={14} /></button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-gray-800/60 rounded-lg border border-gray-700/50 space-y-3">
          <div className="text-sm font-medium text-white">Invite Sub-User</div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email Address</label>
            <input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="user@example.com" autoFocus className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">Permissions</label>
              <button onClick={() => setCreatePerms(createPerms.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS.map(p => p.key))} className="text-xs text-emerald-400 hover:text-emerald-300">
                {createPerms.length === ALL_PERMISSIONS.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            {renderPermGrid(createPerms, setCreatePerms)}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} disabled={creating || !createEmail.trim()} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">{creating ? <Loader2 size={14} className="animate-spin" /> : "Send Invite"}</button>
            <button onClick={() => { setShowCreate(false); setCreateEmail(""); setCreatePerms([]); }} className="px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 text-xs font-medium">Cancel</button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="mb-4 p-4 bg-gray-800/60 rounded-lg border border-amber-700/50 space-y-3">
          <div className="text-sm font-medium text-white">Edit Permissions</div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">Permissions</label>
            <button onClick={() => setEditPerms(editPerms.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS.map(p => p.key))} className="text-xs text-amber-400 hover:text-amber-300">
              {editPerms.length === ALL_PERMISSIONS.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          {renderPermGrid(editPerms, setEditPerms)}
          <div className="flex items-center gap-2">
            <button onClick={handleEdit} disabled={editing} className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold disabled:opacity-50">{editing ? <Loader2 size={14} className="animate-spin" /> : "Save Permissions"}</button>
            <button onClick={() => { setEditingId(null); setEditPerms([]); }} className="px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 text-xs font-medium">Cancel</button>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-950/40 rounded-lg border border-red-700/50">
          <Trash2 size={16} className="text-red-400" />
          <span className="text-sm text-gray-200 flex-1">Remove this sub-user?</span>
          <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50">{deleting ? <Loader2 size={14} className="animate-spin" /> : "Remove"}</button>
          <button onClick={() => setDeletingId(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={16} /></button>
        </div>
      )}

      {loading ? <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Loading users...</div>
      : error ? <div className="text-red-400 text-sm">{error}</div>
      : users.length === 0 ? <p className="text-gray-400 text-sm">No sub-users added yet.</p>
      : <div className="space-y-3">
          {users.map((u: any) => {
            const a = u.attributes;
            const perms = a.permissions || [];
            return (
              <div key={a.uuid} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-400" />
                    <span className="font-medium text-white">{a.email || a.username || "User"}</span>
                    {a.image && <img src={a.image} alt="" className="w-6 h-6 rounded-full" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(a.uuid); setEditPerms([...perms]); }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-amber-400 hover:bg-gray-700"><Pencil size={12} /> Edit</button>
                    <button onClick={() => setDeletingId(a.uuid)} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Shield size={12} />
                  <span>{perms.length} permission{perms.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

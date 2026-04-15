import * as React from "react";
import { Clock, Plus, Trash2, X, Loader2, RefreshCcw, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { panelFetch, panelDelete } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface Props { orderId: string; }

export default function SchedulesTab({ orderId }: Props) {
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", minute: "*", hour: "*", day_of_month: "*", month: "*", day_of_week: "*", is_active: true, only_when_online: false });
  const [creating, setCreating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string|null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string|null>(null);
  const [editForm, setEditForm] = React.useState<any>(null);
  const [editing, setEditing] = React.useState(false);

  const fetchSchedules = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await panelFetch(orderId, "schedules"); setSchedules(d?.data || []); }
    catch(e:any) { setError(e?.message || "Failed to load schedules"); }
    finally { setLoading(false); }
  }, [orderId]);

  React.useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await panelFetch(orderId, "schedules", { method: "POST", body: form });
      toast({ title: "Schedule created" });
      setForm({ name: "", minute: "*", hour: "*", day_of_month: "*", month: "*", day_of_week: "*", is_active: true, only_when_online: false });
      setShowCreate(false);
      fetchSchedules();
    } catch (e: any) { toast({ title: "Create failed", description: e?.message, variant: "destructive" }); }
    finally { setCreating(false); }
  }

  async function handleEdit() {
    if (!editingId || !editForm) return;
    setEditing(true);
    try {
      await panelFetch(orderId, `schedules/${editingId}`, { method: "POST", body: editForm });
      toast({ title: "Schedule updated" });
      setEditingId(null); setEditForm(null);
      fetchSchedules();
    } catch (e: any) { toast({ title: "Update failed", description: e?.message, variant: "destructive" }); }
    finally { setEditing(false); }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await panelDelete(orderId, `schedules/${deletingId}`);
      toast({ title: "Schedule deleted" });
      setDeletingId(null);
      fetchSchedules();
    } catch (e: any) { toast({ title: "Delete failed", description: e?.message, variant: "destructive" }); }
    finally { setDeleting(false); }
  }

  function startEdit(s: any) {
    const a = s.attributes;
    setEditingId(a.id);
    setEditForm({
      name: a.name, minute: a.cron?.minute || "*", hour: a.cron?.hour || "*",
      day_of_month: a.cron?.day_of_month || "*", month: a.cron?.month || "*",
      day_of_week: a.cron?.day_of_week || "*", is_active: a.is_active, only_when_online: a.only_when_online,
    });
  }

  const cronFields = [
    { key: "minute", label: "Minute" },
    { key: "hour", label: "Hour" },
    { key: "day_of_month", label: "Day (M)" },
    { key: "month", label: "Month" },
    { key: "day_of_week", label: "Day (W)" },
  ];

  function CronForm({ f, setF, onSubmit, submitLabel, submitting, onCancel }: any) {
    return (
      <div className="mb-4 p-4 bg-gray-800/60 rounded-lg border border-gray-700/50 space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Schedule Name</label>
          <input type="text" value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Daily restart" autoFocus className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cronFields.map(cf => (
            <div key={cf.key}>
              <label className="block text-xs text-gray-400 mb-1">{cf.label}</label>
              <input type="text" value={f[cf.key]} onChange={e => setF({...f, [cf.key]: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-gray-100 font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={f.is_active} onChange={e => setF({...f, is_active: e.target.checked})} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500" /> Active
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={f.only_when_online} onChange={e => setF({...f, only_when_online: e.target.checked})} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500" /> Only when online
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSubmit} disabled={submitting || !f.name.trim()} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : submitLabel}
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 text-xs font-medium">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Schedules</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"><Plus size={14} /> New Schedule</button>
          <button onClick={fetchSchedules} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"><RefreshCcw size={14} /></button>
        </div>
      </div>

      {showCreate && <CronForm f={form} setF={setForm} onSubmit={handleCreate} submitLabel="Create Schedule" submitting={creating} onCancel={() => setShowCreate(false)} />}
      {editingId && editForm && <CronForm f={editForm} setF={setEditForm} onSubmit={handleEdit} submitLabel="Save Changes" submitting={editing} onCancel={() => { setEditingId(null); setEditForm(null); }} />}

      {deletingId && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-950/40 rounded-lg border border-red-700/50">
          <Trash2 size={16} className="text-red-400" />
          <span className="text-sm text-gray-200 flex-1">Delete this schedule?</span>
          <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50">{deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}</button>
          <button onClick={() => setDeletingId(null)} className="p-1 rounded hover:bg-gray-700 text-gray-400"><X size={16} /></button>
        </div>
      )}

      {loading ? <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Loading...</div>
      : error ? <div className="text-red-400 text-sm">{error}</div>
      : schedules.length === 0 ? <p className="text-gray-400 text-sm">No schedules configured.</p>
      : <div className="space-y-3">
          {schedules.map((s: any) => {
            const a = s.attributes;
            const cron = a.cron;
            return (
              <div key={a.id} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" />
                    <span className="font-medium text-white">{a.name || "Schedule"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {a.is_active ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={10} /> Active</span> : <span className="inline-flex items-center gap-1"><XCircle size={10} /> Inactive</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(s)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-amber-400 hover:bg-gray-700"><Pencil size={12} /> Edit</button>
                    <button onClick={() => setDeletingId(a.id)} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700"><Trash2 size={14} /></button>
                  </div>
                </div>
                {cron && <div className="text-xs text-gray-400 font-mono">{cron.minute} {cron.hour} {cron.day_of_month} {cron.month} {cron.day_of_week}</div>}
                {a.last_run_at && <div className="text-xs text-gray-500 mt-1">Last run: {new Date(a.last_run_at).toLocaleString()}</div>}
                {a.next_run_at && <div className="text-xs text-gray-500">Next run: {new Date(a.next_run_at).toLocaleString()}</div>}
              </div>
            );
          })}
        </div>}
    </div>
  );
}

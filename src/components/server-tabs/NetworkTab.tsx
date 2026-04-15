import * as React from "react";
import { Network, Loader2, RefreshCcw, Star } from "lucide-react";
import { panelFetch } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface Props { orderId: string; }

export default function NetworkTab({ orderId }: Props) {
  const [allocs, setAllocs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const [settingPrimary, setSettingPrimary] = React.useState<string|null>(null);

  const fetchAllocs = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await panelFetch(orderId, "network"); setAllocs(d?.data || []); }
    catch (e: any) { setError(e?.message || "Failed to load allocations"); }
    finally { setLoading(false); }
  }, [orderId]);

  React.useEffect(() => { fetchAllocs(); }, [fetchAllocs]);

  async function handleSetPrimary(allocId: string) {
    setSettingPrimary(allocId);
    try {
      await panelFetch(orderId, `network/${allocId}/primary`, { method: "POST" });
      toast({ title: "Primary allocation updated" });
      fetchAllocs();
    } catch (e: any) { toast({ title: "Failed", description: e?.message, variant: "destructive" }); }
    finally { setSettingPrimary(null); }
  }

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Network / Allocations</h2>
        <button onClick={fetchAllocs} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"><RefreshCcw size={14} /></button>
      </div>

      {loading ? <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Loading...</div>
      : error ? <div className="text-red-400 text-sm">{error}</div>
      : allocs.length === 0 ? <p className="text-gray-400 text-sm">No network allocations found.</p>
      : <div className="space-y-2">
          {allocs.map((a: any) => {
            const attr = a.attributes;
            const isPrimary = attr.is_default;
            return (
              <div key={attr.id} className="flex items-center justify-between px-4 py-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <Network size={16} className={isPrimary ? "text-emerald-400" : "text-gray-400"} />
                  <span className="text-white font-mono text-sm">{attr.ip_alias || attr.ip || "0.0.0.0"}:{attr.port}</span>
                  {attr.notes && <span className="text-xs text-gray-500">({attr.notes})</span>}
                </div>
                <div className="flex items-center gap-2">
                  {isPrimary ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Star size={10} /> Primary</span>
                  ) : (
                    <button onClick={() => handleSetPrimary(attr.id)} disabled={settingPrimary === String(attr.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-emerald-400 hover:bg-gray-700 disabled:opacity-50">
                      {settingPrimary === String(attr.id) ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />} Set Primary
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

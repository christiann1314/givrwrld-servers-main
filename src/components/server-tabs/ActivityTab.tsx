import * as React from "react";
import { Activity, Loader2, RefreshCcw } from "lucide-react";
import { panelFetch } from "@/lib/panelApi";

interface Props { orderId: string; }

export default function ActivityTab({ orderId }: Props) {
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);

  const fetch_ = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await panelFetch(orderId, "activity");
      setActivities(d?.data || []);
    } catch (e: any) { setError(e?.message || "Failed to load activity"); }
    finally { setLoading(false); }
  }, [orderId]);

  React.useEffect(() => { fetch_(); }, [fetch_]);

  function formatEvent(event: string): string {
    return event
      .replace(/:/g, " > ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Activity Log</h2>
        <button onClick={fetch_} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"><RefreshCcw size={14} /></button>
      </div>

      {loading ? <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Loading activity...</div>
      : error ? <div className="text-red-400 text-sm">{error}</div>
      : activities.length === 0 ? <p className="text-gray-400 text-sm">No activity recorded yet.</p>
      : <div className="space-y-2">
          {activities.map((a: any, i: number) => {
            const attr = a.attributes;
            return (
              <div key={attr.id || i} className="flex items-start gap-3 px-4 py-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <Activity size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{formatEvent(attr.event || "unknown")}</div>
                  {attr.description && <div className="text-xs text-gray-400 mt-0.5">{attr.description}</div>}
                  {attr.properties && Object.keys(attr.properties).length > 0 && (
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {Object.entries(attr.properties).map(([k, v]) => (
                        <span key={k} className="mr-3">{k}={String(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">
                  {attr.timestamp ? new Date(attr.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

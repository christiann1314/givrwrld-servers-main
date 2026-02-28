import * as React from "react";
import { api } from "@/lib/api";
import { BarChart3, Loader2, Server, ShoppingCart } from "lucide-react";

export default function DashboardAdminMetrics() {
  const [metrics, setMetrics] = React.useState<Record<string, number> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getAdminMetrics();
        if (res?.metrics && !cancelled) setMetrics(res.metrics);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
        {error}
      </div>
    );
  }

  const cards = [
    { label: "Orders (last 24h)", value: metrics?.ordersLast24h ?? 0, icon: ShoppingCart },
    { label: "Provisioned (last 24h)", value: metrics?.provisionedLast24h ?? 0, icon: Server },
    { label: "Orders created (process)", value: metrics?.orders_created_count ?? 0, icon: BarChart3 },
    { label: "Provision success", value: metrics?.provision_success_count ?? 0, icon: BarChart3 },
    { label: "Provision fail", value: metrics?.provision_fail_count ?? 0, icon: BarChart3 },
    { label: "Uptime (seconds)", value: metrics?.process_uptime_seconds ?? 0, icon: BarChart3 },
  ];

  return (
    <div className="rounded-xl bg-gray-800/60 backdrop-blur-md border border-gray-600/50 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={22} className="text-amber-400" />
        <span className="font-medium">Metrics</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-4 rounded-lg bg-gray-700/40 border border-gray-600/30 flex items-center gap-4"
          >
            <c.icon className="text-amber-400 shrink-0" size={24} />
            <div>
              <p className="text-gray-400 text-sm">{c.label}</p>
              <p className="text-xl font-semibold text-white">{c.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

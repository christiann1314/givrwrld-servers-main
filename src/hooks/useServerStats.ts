 import { useEffect, useRef, useState, useCallback } from "react";
 import { api } from "@/lib/api";

type Stats = {
  state: string | null;
  is_suspended: boolean;
  cpu_percent: number | null;
  memory_bytes: number | null;
  disk_bytes: number | null;
  uptime_ms: number | null;
  network?: { rx_bytes?: number; tx_bytes?: number } | null;
  fetched_at: string;
  server_identifier: string;
};

 export function useServerStats({ orderId, serverIdentifier }: {
  orderId?: string;
  serverIdentifier?: string;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

   const fetchStats = useCallback(async () => {
     try {
       const params = orderId ? `order_id=${orderId}` : `server_identifier=${serverIdentifier}`;
       const response = await api.http<any>(`/api/servers/stats?${params}`);
       setStats(response);
       setError(null);
     } catch (e: any) {
       setError(e.message || "Failed to load stats");
     }
   }, [orderId, serverIdentifier]);
 
  useEffect(() => {
    if (!orderId && !serverIdentifier) {
      return;
    }

    fetchStats();
    timer.current = window.setInterval(fetchStats, 5000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
   }, [orderId, serverIdentifier, fetchStats]);

  return { stats, error };
}
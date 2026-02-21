import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

type LiveMetric = {
  status: 'Online' | 'Offline';
  currentPlayers: number;
  maxPlayers: number;
  cpuPercent: number;
  ramPercent: number;
  uptimeSeconds: number;
};

type SummaryMetric = {
  avgCpuPercent: number;
  peakPlayers: number;
  uptimePercent: number;
  restartCount: number;
};

function resolveWsUrl() {
  const env = (import.meta as any)?.env;
  const raw = String(env?.VITE_API_URL || env?.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const wsProtocol = raw.startsWith('https://') ? 'wss://' : 'ws://';
  const host = raw.replace(/^https?:\/\//, '');
  return `${wsProtocol}${host}/ws/servers/metrics`;
}

export function useServiceMetrics(serverIds: string[]) {
  const [liveByServer, setLiveByServer] = useState<Record<string, LiveMetric>>({});
  const [summaryByServer, setSummaryByServer] = useState<Record<string, SummaryMetric>>({});
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const loadMetrics = async () => {
    if (serverIds.length === 0) {
      setLiveByServer({});
      setSummaryByServer({});
      return;
    }
    setLoading(true);
    try {
      const [liveResp, summaryResp] = await Promise.all([
        api.http<any>('/api/servers/metrics/live'),
        api.http<any>('/api/servers/metrics/summary?days=7'),
      ]);
      setLiveByServer(liveResp?.metrics || {});
      setSummaryByServer(summaryResp?.summary || {});
    } catch (error) {
      console.warn('Failed to load service metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const timer = window.setInterval(loadMetrics, 15000);
    return () => {
      window.clearInterval(timer);
    };
  }, [serverIds.join('|')]);

  useEffect(() => {
    const wsUrl = resolveWsUrl();
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data || '{}');
          if (payload?.type === 'server.metrics.live' && payload?.metrics) {
            setLiveByServer((prev) => ({ ...prev, ...payload.metrics }));
          }
        } catch {
          // Ignore malformed websocket events.
        }
      };
    } catch {
      setWsConnected(false);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const filteredLive = useMemo(() => {
    if (serverIds.length === 0) return {};
    const next: Record<string, LiveMetric> = {};
    for (const id of serverIds) {
      if (liveByServer[id]) next[id] = liveByServer[id];
    }
    return next;
  }, [serverIds.join('|'), liveByServer]);

  return {
    liveByServer: filteredLive,
    summaryByServer,
    loading,
    wsConnected,
    refresh: loadMetrics,
  };
}


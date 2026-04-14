import { useEffect, useMemo, useState } from 'react';
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

export function useServiceMetrics(serverIds: string[]) {
  const [liveByServer, setLiveByServer] = useState<Record<string, LiveMetric>>({});
  const [summaryByServer, setSummaryByServer] = useState<Record<string, SummaryMetric>>({});
  const [loading, setLoading] = useState(false);

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
    refresh: loadMetrics,
  };
}


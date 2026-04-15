import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface ServerAddon {
  active: boolean;
  addon_name: string;
  order_id: string;
  purchased_at: string;
}

export interface ServerAddonsMap {
  [planId: string]: ServerAddon;
}

export function useServerAddons(orderId: string | undefined) {
  const [addons, setAddons] = useState<ServerAddonsMap>({});
  const [addonsList, setAddonsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await api.http(`/api/servers/${encodeURIComponent(orderId)}/addons`);
      setAddons(res?.addons || {});
      setAddonsList(res?.addons_list || []);
    } catch {
      setAddons({});
      setAddonsList([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasAddon = useCallback(
    (planId: string) => !!addons[planId]?.active,
    [addons],
  );

  return { addons, addonsList, loading, refresh, hasAddon };
}

import * as React from "react";
import { Terminal, Save, Loader2, RefreshCcw } from "lucide-react";
import { panelFetch } from "@/lib/panelApi";
import { toast } from "@/components/ui/use-toast";

interface Props { orderId: string; }

interface StartupVar {
  env_variable: string;
  name: string;
  description: string;
  server_value: string;
  default_value: string;
  is_editable: boolean;
  rules: string;
}

export default function StartupTab({ orderId }: Props) {
  const [vars, setVars] = React.useState<StartupVar[]>([]);
  const [startup, setStartup] = React.useState("");
  const [dockerImg, setDockerImg] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = React.useState<string|null>(null);

  const fetch_ = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await panelFetch(orderId, "startup");
      const rawVars = (d?.data || []).map((v: any) => v.attributes);
      setVars(rawVars);
      setStartup(d?.meta?.startup_command || "");
      setDockerImg(d?.meta?.docker_image || "");
      const vals: Record<string, string> = {};
      rawVars.forEach((v: StartupVar) => { vals[v.env_variable] = v.server_value ?? v.default_value ?? ""; });
      setEditValues(vals);
    } catch (e: any) { setError(e?.message || "Failed to load startup"); }
    finally { setLoading(false); }
  }, [orderId]);

  React.useEffect(() => { fetch_(); }, [fetch_]);

  async function handleSave(envVar: string) {
    setSavingKey(envVar);
    try {
      await panelFetch(orderId, "startup/variable", {
        method: "PUT",
        body: { key: envVar, value: editValues[envVar] || "" },
      });
      toast({ title: "Variable saved", description: envVar });
      fetch_();
    } catch (e: any) { toast({ title: "Save failed", description: e?.message, variant: "destructive" }); }
    finally { setSavingKey(null); }
  }

  const hasChanged = (v: StartupVar) => {
    const current = editValues[v.env_variable];
    const original = v.server_value ?? v.default_value ?? "";
    return current !== undefined && current !== original;
  };

  return (
    <div className="bg-gray-900/90 border border-gray-600 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Startup Configuration</h2>
        <button onClick={fetch_} className="p-1.5 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"><RefreshCcw size={14} /></button>
      </div>

      {loading ? <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Loading startup...</div>
      : error ? <div className="text-red-400 text-sm">{error}</div>
      : <>
          {startup && (
            <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 mb-4">
              <div className="text-xs text-gray-400 mb-1">Startup Command</div>
              <code className="text-sm text-emerald-300 break-all">{startup}</code>
            </div>
          )}
          {dockerImg && (
            <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 mb-4">
              <div className="text-xs text-gray-400 mb-1">Docker Image</div>
              <code className="text-sm text-blue-300 break-all">{dockerImg}</code>
            </div>
          )}
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Terminal size={14} /> Environment Variables
            </div>
            {vars.length === 0 && <p className="text-gray-500 text-sm">No startup variables.</p>}
            {vars.map((v) => (
              <div key={v.env_variable} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-white">{v.name}</span>
                    <span className="text-xs text-gray-500 font-mono ml-2">{v.env_variable}</span>
                  </div>
                  {v.is_editable && hasChanged(v) && (
                    <button
                      onClick={() => handleSave(v.env_variable)}
                      disabled={savingKey === v.env_variable}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {savingKey === v.env_variable ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  )}
                </div>
                {v.description && <p className="text-xs text-gray-400 mb-2">{v.description}</p>}
                {v.is_editable ? (
                  <input
                    type="text"
                    value={editValues[v.env_variable] ?? ""}
                    onChange={e => setEditValues(prev => ({ ...prev, [v.env_variable]: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-emerald-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="text-sm text-emerald-300 font-mono bg-gray-900/50 rounded px-3 py-2 border border-gray-700/30">
                    {v.server_value ?? v.default_value ?? ""}
                  </div>
                )}
                {v.rules && <div className="text-xs text-gray-500 mt-1">Rules: {v.rules}</div>}
              </div>
            ))}
          </div>
        </>}
    </div>
  );
}

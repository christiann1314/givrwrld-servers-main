import * as React from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { MessageSquare, Loader2 } from "lucide-react";

interface TicketRow {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export default function DashboardAdminTickets() {
  const [tickets, setTickets] = React.useState<TicketRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getAdminTickets();
        if (res && (res as { tickets?: TicketRow[] }).tickets && !cancelled) {
          setTickets((res as { tickets: TicketRow[] }).tickets);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load tickets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function statusColor(s: string): string {
    if (s === "open") return "bg-emerald-500/20 text-emerald-400";
    if (s === "pending") return "bg-amber-500/20 text-amber-400";
    return "bg-gray-500/20 text-gray-400";
  }

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

  return (
    <div className="rounded-xl bg-gray-800/60 backdrop-blur-md border border-gray-600/50 overflow-hidden">
      <div className="p-4 border-b border-gray-600/50 flex items-center gap-2">
        <MessageSquare size={20} className="text-amber-400" />
        <span className="font-medium">All tickets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-gray-600/50">
              <th className="p-3">Subject</th>
              <th className="p-3">User</th>
              <th className="p-3">Category</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  No tickets yet.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="border-b border-gray-600/30 hover:bg-gray-700/30">
                  <td className="p-3 font-medium text-white">{t.subject}</td>
                  <td className="p-3 text-gray-300">{t.user_email || t.user_name || "—"}</td>
                  <td className="p-3 text-gray-400">{t.category}</td>
                  <td className="p-3 text-gray-400">{t.priority}</td>
                  <td className="p-3">
                    <span className={"px-2 py-1 rounded text-sm " + statusColor(t.status)}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">
                    {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <Link to={"/dashboard/admin/tickets/" + t.id} className="text-amber-400 hover:text-amber-300 text-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

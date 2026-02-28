import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, Loader2, Send } from "lucide-react";

type Message = {
  id: string;
  user_id: string;
  is_staff: number;
  message: string;
  created_at: string;
};

export default function DashboardAdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getAdminTicket(id);
      if (res?.ticket) setTicket(res.ticket);
      if (Array.isArray(res?.messages)) setMessages(res.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reply.trim() || sending) return;
    setSending(true);
    try {
      await api.postAdminTicketReply(id, reply.trim());
      setReply("");
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!id || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await api.patchAdminTicket(id, status);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    );
  }
  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">{error || "Ticket not found."}</p>
        <button
          onClick={() => navigate("/dashboard/admin/tickets")}
          className="text-amber-400 hover:text-amber-300"
        >
          Back to tickets
        </button>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === "open") return "bg-emerald-500/20 text-emerald-400";
    if (s === "pending") return "bg-amber-500/20 text-amber-400";
    return "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/dashboard/admin/tickets")}
        className="inline-flex items-center text-amber-400 hover:text-amber-300"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to tickets
      </button>

      <div className="rounded-xl bg-gray-800/60 backdrop-blur-md border border-gray-600/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{ticket.subject}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {ticket.user_email || ticket.user_name || "—"} · {ticket.category} · {ticket.priority}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={"px-2 py-1 rounded text-sm " + statusColor(ticket.status)}>
              {ticket.status}
            </span>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 mt-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.is_staff
                  ? "p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
                  : "p-4 rounded-lg bg-gray-700/40 border border-gray-600/30"
              }
            >
              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                <span>{m.is_staff ? "Staff" : "User"}</span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="text-white whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>

        {ticket.status !== "closed" && (
          <form onSubmit={handleReply} className="mt-6 flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply as staff..."
              rows={3}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none"
            />
            <button
              type="submit"
              disabled={!reply.trim() || sending}
              className="self-end px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Reply
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

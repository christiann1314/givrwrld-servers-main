import * as React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, BarChart3 } from "lucide-react";

export default function DashboardAdminOverview() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Link
        to="/dashboard/admin/tickets"
        className="block p-6 rounded-xl bg-gray-800/60 backdrop-blur-md border border-gray-600/50 hover:border-amber-500/40 transition-colors"
      >
        <MessageSquare className="text-amber-400 mb-3" size={32} />
        <h2 className="text-xl font-semibold text-white mb-1">Support tickets</h2>
        <p className="text-gray-400">View and reply to all support tickets.</p>
      </Link>
      <Link
        to="/dashboard/admin/metrics"
        className="block p-6 rounded-xl bg-gray-800/60 backdrop-blur-md border border-gray-600/50 hover:border-amber-500/40 transition-colors"
      >
        <BarChart3 className="text-amber-400 mb-3" size={32} />
        <h2 className="text-xl font-semibold text-white mb-1">Metrics</h2>
        <p className="text-gray-400">Orders, provisioning, and system metrics.</p>
      </Link>
    </div>
  );
}

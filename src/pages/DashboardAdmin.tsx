import * as React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, MessageSquare, BarChart3, Shield } from "lucide-react";

const adminNav = [
  { name: "Overview", path: "/dashboard/admin", icon: Shield },
  { name: "Tickets", path: "/dashboard/admin/tickets", icon: MessageSquare },
  { name: "Metrics", path: "/dashboard/admin/metrics", icon: BarChart3 },
];

export default function DashboardAdmin() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/6da1a729-a66c-4bed-bc67-af6d75baa23a.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/32 to-gray-900/58" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/15 via-transparent to-emerald-800/10" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
              Admin
            </span>
          </h1>
          <p className="text-gray-300">Tickets, metrics, and moderation</p>
        </div>

        <nav className="flex gap-4 mb-8 border-b border-gray-600/50 pb-4">
          {adminNav.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/dashboard/admin" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  active ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}

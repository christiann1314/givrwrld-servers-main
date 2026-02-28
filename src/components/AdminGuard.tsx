import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Protects admin routes: only users with admin (or moderator) role can access.
 * Others are redirected to /dashboard.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isAdmin = Boolean(user?.roles?.includes("admin") || user?.roles?.includes("moderator"));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

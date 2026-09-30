import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../hooks/useAdminAuth";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { status, hasPermission } = useAdminAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
        <section className="max-w-md rounded-anm-panel border border-white/10 bg-anm-surface-glass p-6 text-center shadow-anm-card-glow">
          <ShieldCheck className="mx-auto h-8 w-8 text-anm-blue" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Checking admin session</h1>
          <p className="mt-3 text-sm leading-6 text-white/62">Verifying secure admin access.</p>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (!hasPermission("admin.access")) return <Navigate to="/admin/access-denied" replace />;

  return <>{children}</>;
}

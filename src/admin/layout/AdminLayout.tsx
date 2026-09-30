import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SEOHead } from "../../components/SEOHead";
import { AdminSidebar, AdminTopbar } from "../components";
import { useAdminSidebar } from "../hooks/useAdminSidebar";

const adminMetadata = {
  title: "Admin | Ascend Nexus Media",
  description: "Internal Ascend Nexus Media content administration portal.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const sidebar = useAdminSidebar();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-anm-bg text-white">
      <SEOHead metadata={adminMetadata} disableSocial />
      <div
        className="grid min-h-screen transition-[grid-template-columns] duration-200 ease-anm-out motion-reduce:transition-none lg:grid-cols-[var(--admin-sidebar-width)_1fr]"
        style={{ "--admin-sidebar-width": sidebar.collapsed ? "var(--admin-sidebar-collapsed-width)" : "var(--admin-sidebar-expanded-width)" } as CSSProperties}
      >
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>
        <div className="min-w-0">
          <AdminTopbar mobileNavOpen={mobileNavOpen} onToggleMobileNav={() => setMobileNavOpen((value) => !value)} />
          {mobileNavOpen ? (
            <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" aria-hidden onClick={() => setMobileNavOpen(false)} />
          ) : null}
          <div
            className={`fixed bottom-0 left-0 top-0 z-50 w-72 transform transition duration-300 ease-anm-out lg:hidden ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <AdminSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

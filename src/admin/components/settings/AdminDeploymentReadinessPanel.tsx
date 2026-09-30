import type { AdminSettingsViewModel } from "../../../models/admin";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSettingsStatusBadge } from "./AdminSettingsStatusBadge";
import { useEffect, useState } from "react";

interface AdminDeploymentReadinessPanelProps {
  settings: AdminSettingsViewModel;
}

export function AdminDeploymentReadinessPanel({ settings }: AdminDeploymentReadinessPanelProps) {
  const [configurationHealth, setConfigurationHealth] = useState<Array<{ label: string; status: "configured" | "missing" | "unknown"; description: string }>>([]);
  const [databaseHealth, setDatabaseHealth] = useState<Array<{ label: string; status: "configured" | "missing" | "unknown"; description: string }>>([]);

  useEffect(() => {
    const env = import.meta.env as Record<string, string | undefined>;
    const base = env.VITE_MEDIA_UPLOAD_API_BASE_URL?.replace(/\/+$/, "");
    const token = env.VITE_MEDIA_ADMIN_DEV_TOKEN;
    if (!base) return;
    let canceled = false;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    fetch(`${base}/api/admin/system/configuration/health`, { headers, credentials: "include" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Configuration health request failed: ${response.status}`)))
      .then((payload) => {
        if (canceled || !payload?.data?.services) return;
        setConfigurationHealth(payload.data.services.map((service: { name: string; status: string; message: string }) => ({
          label: `Config: ${service.name}`,
          status: service.status === "healthy" ? "configured" : service.status === "disabled" ? "missing" : "unknown",
          description: service.message,
        })));
      })
      .catch(() => {
        if (!canceled) setConfigurationHealth([]);
      });
    fetch(`${base}/api/admin/system/database/health`, { headers, credentials: "include" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Database health request failed: ${response.status}`)))
      .then((payload) => {
        if (canceled || !payload?.data) return;
        const data = payload.data;
        setDatabaseHealth([
          {
            label: "Database: connection",
            status: data.connection?.connected ? "configured" : "missing",
            description: data.connection?.connected ? "MongoDB connection is available." : "MongoDB is not connected or not configured.",
          },
          {
            label: "Database: migrations",
            status: data.migrations?.status === "current" ? "configured" : "unknown",
            description: data.migrations?.status === "current" ? "Migrations are current." : "Pending or unavailable migration state.",
          },
          {
            label: "Database: indexes",
            status: data.indexes?.status === "healthy" ? "configured" : "unknown",
            description: data.indexes?.status === "healthy" ? "Required indexes are present." : "Index check requires attention.",
          },
          {
            label: "Database: integrity",
            status: data.integrity?.status === "healthy" ? "configured" : "unknown",
            description: data.integrity?.status === "healthy" ? "No integrity issues detected." : "Integrity report contains warnings or could not run.",
          },
        ]);
      })
      .catch(() => {
        if (!canceled) setDatabaseHealth([]);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const checks = [...settings.deploymentReadiness, ...configurationHealth, ...databaseHealth];

  return (
    <AdminSettingsPanel title="Environment / Deployment Readiness" description="Security-safe checks only. Sensitive values are never displayed.">
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border border-white/10 bg-black/18 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{check.label}</p>
              <AdminSettingsStatusBadge status={check.status} />
            </div>
            {check.description ? <p className="mt-2 text-xs text-white/46">{check.description}</p> : null}
          </div>
        ))}
      </div>
    </AdminSettingsPanel>
  );
}

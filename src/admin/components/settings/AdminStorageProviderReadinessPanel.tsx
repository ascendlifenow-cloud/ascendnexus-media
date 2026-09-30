import type { AdminSettingStatus } from "../../../models/admin";
import { defaultStorageProviderConfig } from "../../../config/mediaStorageConfig";
import { mediaCdnService } from "../../../services/media";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSettingsStatusBadge } from "./AdminSettingsStatusBadge";
import { useEffect, useState } from "react";

const status = (configured: boolean, notRequired = false): AdminSettingStatus =>
  configured ? "configured" : notRequired ? "not_required" : "missing";

export function AdminStorageProviderReadinessPanel() {
  const [backendChecks, setBackendChecks] = useState<Array<{ label: string; status: AdminSettingStatus; description: string }>>([]);
  const storage = defaultStorageProviderConfig;
  const cdn = mediaCdnService.getCdnConfig();

  useEffect(() => {
    const env = import.meta.env as Record<string, string | undefined>;
    const base = env.VITE_MEDIA_UPLOAD_API_BASE_URL?.replace(/\/+$/, "");
    const token = env.VITE_MEDIA_ADMIN_DEV_TOKEN;
    if (!base) return;
    let canceled = false;
    fetch(`${base}/api/admin/media/storage/health`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Storage health failed: ${response.status}`)))
      .then((payload) => {
        if (canceled || !payload?.health) return;
        const health = payload.health;
        setBackendChecks([
          { label: "Backend Provider", status: health.configured ? "configured" : "missing", description: health.provider ?? "Unknown" },
          { label: "Bucket Access", status: health.bucketAccessible ? "configured" : "missing", description: health.bucketAccessible ? "Accessible" : "Unavailable or not configured" },
          { label: "Signed URLs", status: health.signedUrlsSupported ? "configured" : "missing", description: health.signedUrlsSupported ? "Supported" : "Unavailable" },
          { label: "Multipart Upload", status: health.multipartSupported ? "configured" : "unknown", description: health.multipartSupported ? "Supported" : "Falls back to backend proxy" },
          { label: "Copy/Promotion", status: health.copySupported ? "configured" : "unknown", description: health.copySupported ? "Provider copy available" : "Promotion copy unsupported" },
          { label: "Full-song Privacy", status: health.databaseSynchronized ? "configured" : "unknown", description: health.databaseSynchronized ? "No reconciliation issues" : "Run reconciliation for details" },
          { label: "Mock Fallback", status: health.mockDisabled ? "configured" : "unknown", description: health.mockDisabled ? "Disabled for production safety" : "Allowed in local development" },
        ]);
      })
      .catch(() => {
        if (!canceled) setBackendChecks([]);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const checks = [
    {
      label: "Active Frontend Provider",
      status: "configured" as const,
      description: storage.provider,
    },
    {
      label: "Backend Upload API",
      status: status(Boolean(storage.uploadApiBaseUrl), storage.provider !== "custom"),
      description: storage.uploadApiBaseUrl ? "Configured" : "Only required when custom/backend uploads are enabled.",
    },
    {
      label: "Mock Uploads",
      status: storage.mockEnabled ? "configured" as const : "not_required" as const,
      description: storage.mockEnabled ? "Mock uploads remain available for development fallback." : "Mock uploads disabled.",
    },
    {
      label: "Public Media Base URL",
      status: status(Boolean(storage.baseUrl)),
      description: storage.baseUrl ? "Configured" : "Missing public media base URL.",
    },
    {
      label: "CDN Base URL",
      status: status(Boolean(cdn.baseUrl || cdn.imageBaseUrl || cdn.audioBaseUrl), !cdn.enabled),
      description: cdn.enabled ? "CDN enabled; base URL readiness checked." : "CDN disabled; storage URL fallback is active.",
    },
    {
      label: "Signed URL Readiness",
      status: storage.provider === "custom" ? "configured" as const : "not_required" as const,
      description: storage.provider === "custom" ? "Backend signed URL endpoint is used for private media." : "Local/mock signed URL readiness only.",
    },
    ...backendChecks,
  ];

  return (
    <AdminSettingsPanel title="Production Storage Readiness" description="Frontend-visible storage readiness only. Backend credentials are never displayed.">
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border border-white/10 bg-black/18 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{check.label}</p>
              <AdminSettingsStatusBadge status={check.status} />
            </div>
            <p className="mt-2 text-xs text-white/46">{check.description}</p>
          </div>
        ))}
      </div>
    </AdminSettingsPanel>
  );
}

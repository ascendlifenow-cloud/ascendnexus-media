import { mediaCdnService } from "../../../services/media";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSettingsStatusBadge } from "./AdminSettingsStatusBadge";

export function AdminCdnReadinessPanel() {
  const config = mediaCdnService.getCdnConfig();
  const enabled = mediaCdnService.isCdnEnabled();
  const checks = [
    { label: "CDN Status", status: enabled ? "configured" as const : "missing" as const, description: enabled ? "CDN URL transformation is enabled." : "CDN URL transformation is disabled until base URLs are configured." },
    { label: "Provider", status: config.provider === "none" ? "missing" as const : "configured" as const, description: config.provider },
    { label: "Base URL", status: config.baseUrl ? "configured" as const : "missing" as const, description: config.baseUrl ? "Configured" : "Missing" },
    { label: "Image CDN URL", status: config.imageBaseUrl ? "configured" as const : "not_required" as const, description: config.imageBaseUrl ? "Configured" : "Falls back to base URL" },
    { label: "Audio CDN URL", status: config.audioBaseUrl ? "configured" as const : "not_required" as const, description: config.audioBaseUrl ? "Configured" : "Falls back to base URL" },
    { label: "Cache Strategy", status: "configured" as const, description: config.cacheBustStrategy.replace(/_/g, " ") },
    { label: "Responsive Images", status: config.responsiveImagesEnabled ? "configured" as const : "not_required" as const, description: config.responsiveImagesEnabled ? "Source set builder enabled" : "Disabled" },
    { label: "Invalidation", status: enabled ? "unknown" as const : "not_required" as const, description: enabled ? "Provider API submission is prepared." : "Skipped while CDN is disabled." },
  ];
  return (
    <AdminSettingsPanel title="Public Media CDN Readiness" description="Future CDN delivery checks for public images, audio previews, cache busting, responsive sources, and invalidation readiness.">
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

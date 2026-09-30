import type { AdminSettingsViewModel } from "../../../models/admin";
import { AdminSettingsActions } from "./AdminSettingsActions";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSettingsStatusBadge } from "./AdminSettingsStatusBadge";

interface AdminSiteIdentityPanelProps {
  settings: AdminSettingsViewModel;
}

export function AdminSiteIdentityPanel({ settings }: AdminSiteIdentityPanelProps) {
  const seoDefaults = settings.siteIdentity.seoDefaults;
  const defaultTitle = seoDefaults && "defaultTitle" in seoDefaults ? seoDefaults.defaultTitle : seoDefaults?.title;
  const defaultDescription = seoDefaults && "defaultDescription" in seoDefaults ? seoDefaults.defaultDescription : seoDefaults?.description;

  return (
    <AdminSettingsPanel title="Site Identity" description="Public identity, SEO defaults, and base URL readiness.">
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Site Name</p>
            <p className="mt-1 text-lg font-semibold text-white">{settings.siteIdentity.siteName || "Missing site name"}</p>
          </div>
          <AdminSettingsActions label="site identity" />
        </div>
        <p className="text-sm leading-6 text-white/62">{settings.siteIdentity.siteDescription || "Missing site description"}</p>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/18 p-3">
            <dt className="text-white/42">Public Base URL</dt>
            <dd className="mt-2"><AdminSettingsStatusBadge status={settings.siteIdentity.publicBaseUrlStatus} /></dd>
          </div>
          <div className="rounded-md border border-white/10 bg-black/18 p-3">
            <dt className="text-white/42">Default SEO Title</dt>
            <dd className="mt-2 text-white/76">{defaultTitle || "Missing"}</dd>
          </div>
          <div className="rounded-md border border-white/10 bg-black/18 p-3 md:col-span-2">
            <dt className="text-white/42">Default SEO Description</dt>
            <dd className="mt-2 text-white/76">{defaultDescription || "Missing"}</dd>
          </div>
        </dl>
      </div>
    </AdminSettingsPanel>
  );
}

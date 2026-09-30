import type { AdminSettingsViewModel } from "../../../models/admin";
import { CoverArtImage } from "../../../components/media/CoverArtImage";
import { AdminSettingsActions } from "./AdminSettingsActions";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSettingsStatusBadge } from "./AdminSettingsStatusBadge";

interface AdminBrandAssetsPanelProps {
  settings: AdminSettingsViewModel;
}

export function AdminBrandAssetsPanel({ settings }: AdminBrandAssetsPanelProps) {
  return (
    <AdminSettingsPanel title="Brand Assets" description="Fallback and brand media readiness for public surfaces.">
      <div className="grid gap-3 sm:grid-cols-2">
        {settings.brandAssets.map((asset) => (
          <div key={asset.label} className="rounded-md border border-white/10 bg-black/18 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{asset.label}</p>
                <p className="mt-1 break-all text-xs text-white/48">{asset.url || "Missing URL"}</p>
              </div>
              <AdminSettingsStatusBadge status={asset.status} />
            </div>
            <div className="mt-3 max-w-32">
              <CoverArtImage src={asset.url} title={asset.label} size="thumbnail" fallbackVariant="minimal" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <AdminSettingsActions label="brand assets" />
      </div>
    </AdminSettingsPanel>
  );
}

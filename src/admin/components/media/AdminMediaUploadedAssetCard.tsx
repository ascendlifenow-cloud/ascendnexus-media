import type { MediaAssetRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { AdminMediaPreviewFrame } from "./AdminMediaPreviewFrame";
import { AdminMediaTypeBadge } from "./AdminMediaTypeBadge";
import { AdminMediaStatusBadge } from "./AdminMediaStatusBadge";
import { AdminMediaUploadAssignmentStatus } from "./AdminMediaUploadAssignmentStatus";

interface AdminMediaUploadedAssetCardProps {
  asset: MediaAssetRecord;
  onView: (asset: MediaAssetRecord) => void;
}

export function AdminMediaUploadedAssetCard({ asset, onView }: AdminMediaUploadedAssetCardProps) {
  return (
    <article className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[10rem_1fr]">
      <AdminMediaPreviewFrame asset={asset} compact />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <AdminMediaTypeBadge assetType={asset.assetType} />
          <AdminMediaStatusBadge status={asset.status} />
        </div>
        <h3 className="mt-2 line-clamp-1 text-base font-semibold text-white">{asset.title}</h3>
        <p className="mt-1 break-all text-xs text-white/50">{asset.url}</p>
        <div className="mt-3">
          <AdminMediaUploadAssignmentStatus asset={asset} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="glass" size="sm" onClick={() => onView(asset)}>
            View Uploaded Asset
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled>
            Assign Later
          </Button>
        </div>
      </div>
    </article>
  );
}

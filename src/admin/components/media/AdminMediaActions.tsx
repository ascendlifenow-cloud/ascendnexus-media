import { Eye, Pencil } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";
import { MediaLifecycleActionButtons } from "./MediaLifecycleActionButtons";

interface AdminMediaActionsProps {
  asset: MediaAssetRecord;
  onView: (asset: MediaAssetRecord) => void;
  onAssetUpdated?: (asset: MediaAssetRecord) => void;
}

export function AdminMediaActions({ asset, onView, onAssetUpdated }: AdminMediaActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <Button type="button" variant="glass" size="sm" onClick={() => onView(asset)} aria-label={`View details for ${asset.title}`}>
        <Eye className="h-4 w-4" aria-hidden />
        Details
      </Button>
      <LinkButton to={`/admin/media/${asset.assetId}/edit`} variant="glass" size="sm" aria-label={`Edit ${asset.title}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </LinkButton>
      <MediaLifecycleActionButtons asset={asset} onAssetUpdated={onAssetUpdated} compact />
    </div>
  );
}

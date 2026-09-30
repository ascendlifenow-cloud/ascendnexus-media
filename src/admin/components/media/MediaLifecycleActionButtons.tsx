import { useState } from "react";
import { Archive, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { mediaAssetLifecycleService } from "../../../services/media";
import { isMediaAssetSoftDeleted } from "../../../utils/media/mediaLifecycleUtils";

interface MediaLifecycleActionButtonsProps {
  asset: MediaAssetRecord;
  onAssetUpdated?: (asset: MediaAssetRecord) => void;
  compact?: boolean;
}

export function MediaLifecycleActionButtons({ asset, onAssetUpdated, compact = false }: MediaLifecycleActionButtonsProps) {
  const [busyAction, setBusyAction] = useState<"archive" | "delete" | undefined>();
  const softDeleted = isMediaAssetSoftDeleted(asset);
  const deleteAvailable = asset.status === "archived" && !softDeleted;

  const archiveOrRestore = async () => {
    setBusyAction("archive");
    try {
      const result = asset.status === "archived" && !softDeleted
        ? await mediaAssetLifecycleService.restoreMediaAsset(asset.assetId)
        : await mediaAssetLifecycleService.archiveMediaAsset(asset.assetId);
      if (result.success && result.asset) onAssetUpdated?.(result.asset);
      else window.alert(result.errors?.join("\n") || result.warnings?.join("\n") || "Media lifecycle update was blocked.");
    } finally {
      setBusyAction(undefined);
    }
  };

  const softDelete = async () => {
    if (!deleteAvailable) {
      window.alert("Archive this media asset before deleting it. Linked, public, or active-version assets may still be blocked by the deletion policy.");
      return;
    }
    const confirmed = window.confirm(`Delete "${asset.title || "this media asset"}"? This will move it to Recently Deleted and keep hard deletion disabled.`);
    if (!confirmed) return;
    setBusyAction("delete");
    try {
      const result = await mediaAssetLifecycleService.softDeleteMediaAsset(asset.assetId);
      if (result.success && result.asset) onAssetUpdated?.(result.asset);
      else window.alert(result.errors?.join("\n") || result.warnings?.join("\n") || "Media delete was blocked.");
    } finally {
      setBusyAction(undefined);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="glass" size="sm" onClick={archiveOrRestore} disabled={softDeleted || Boolean(busyAction)} isLoading={busyAction === "archive"}>
        {asset.status === "archived" ? <RotateCcw className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
        {asset.status === "archived" ? "Restore" : "Archive"}
      </Button>
      <Button
        type="button"
        variant={deleteAvailable ? "danger" : "glass"}
        size="sm"
        onClick={softDelete}
        disabled={softDeleted || Boolean(busyAction)}
        isLoading={busyAction === "delete"}
        title={deleteAvailable ? "Move this archived asset to Recently Deleted." : "Archive this asset before deleting it."}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete
      </Button>
      {!compact ? (
        <>
          <Button type="button" variant="ghost" size="sm" disabled>
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Hard Delete Off
          </Button>
        </>
      ) : null}
    </div>
  );
}

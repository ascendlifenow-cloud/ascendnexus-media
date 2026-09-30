import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaDeletionReadiness } from "../../../models/media";
import { Button } from "../../../components/ui/Button";
import { MediaDeletionReadinessPanel } from "./MediaDeletionReadinessPanel";

interface MediaArchiveConfirmModalProps {
  asset: MediaAssetRecord;
  readiness: MediaDeletionReadiness;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function MediaArchiveConfirmModal({ asset, readiness, onConfirm, onCancel }: MediaArchiveConfirmModalProps) {
  return (
    <div className="rounded-md border border-white/10 bg-black/24 p-4">
      <p className="text-sm font-semibold text-white">Archive {asset.title}</p>
      <p className="mt-1 text-sm text-white/58">Archive preserves files and history while removing the asset from public-safe use.</p>
      <div className="mt-3"><MediaDeletionReadinessPanel readiness={readiness} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="glass" size="sm" disabled={!readiness.allowed} onClick={onConfirm}>Confirm Archive</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}


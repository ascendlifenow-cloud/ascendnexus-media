import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaDeletionReadiness } from "../../../models/media";
import { Button } from "../../../components/ui/Button";
import { MediaDeletionReadinessPanel } from "./MediaDeletionReadinessPanel";

interface MediaDeleteConfirmModalProps {
  asset: MediaAssetRecord;
  readiness: MediaDeletionReadiness;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function MediaDeleteConfirmModal({ asset, readiness, onConfirm, onCancel }: MediaDeleteConfirmModalProps) {
  return (
    <div className="rounded-md border border-anm-pink/25 bg-anm-pink/8 p-4">
      <p className="text-sm font-semibold text-white">Delete Readiness for {asset.title}</p>
      <p className="mt-1 text-sm text-white/58">Delete is blocked by default for linked, public, or active-version assets. Storage hard delete is backend-ready only.</p>
      <div className="mt-3"><MediaDeletionReadinessPanel readiness={readiness} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="glass" size="sm" disabled={!readiness.allowed} onClick={onConfirm}>Confirm Soft Delete</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}


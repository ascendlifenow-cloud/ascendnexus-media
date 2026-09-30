import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaDeletionReadiness } from "../../../models/media";
import { Button } from "../../../components/ui/Button";
import { MediaDeletionReadinessPanel } from "./MediaDeletionReadinessPanel";

interface MediaRestoreConfirmModalProps {
  asset: MediaAssetRecord;
  readiness: MediaDeletionReadiness;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function MediaRestoreConfirmModal({ asset, readiness, onConfirm, onCancel }: MediaRestoreConfirmModalProps) {
  return (
    <div className="rounded-md border border-white/10 bg-black/24 p-4">
      <p className="text-sm font-semibold text-white">Restore {asset.title}</p>
      <p className="mt-1 text-sm text-white/58">Restore defaults to draft unless public impact is explicitly confirmed.</p>
      <div className="mt-3"><MediaDeletionReadinessPanel readiness={readiness} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="glass" size="sm" disabled={!readiness.allowed} onClick={onConfirm}>Confirm Restore</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}


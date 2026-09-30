import type { MediaAssetRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";

export function MediaAssetReplaceConfirm({
  currentAsset,
  nextAsset,
  onConfirm,
  onCancel,
}: {
  currentAsset?: MediaAssetRecord | null;
  nextAsset?: MediaAssetRecord | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!currentAsset || !nextAsset) return null;
  return (
    <div className="rounded-md border border-anm-gold/20 bg-anm-gold/10 p-3">
      <p className="text-sm text-white/72">
        Replace <span className="font-semibold text-white">{currentAsset.title}</span> with <span className="font-semibold text-white">{nextAsset.title}</span>?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={onConfirm}>Replace</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

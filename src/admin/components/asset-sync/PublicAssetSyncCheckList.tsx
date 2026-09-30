import type { PublicAssetSyncCheck } from "../../../models/admin";
import { PublicAssetSyncCheckItem } from "./PublicAssetSyncCheckItem";

interface PublicAssetSyncCheckListProps {
  checks: readonly PublicAssetSyncCheck[];
}

export function PublicAssetSyncCheckList({ checks }: PublicAssetSyncCheckListProps) {
  if (!checks.length) return <p className="rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/56">No sync checks have run yet.</p>;
  return (
    <div className="grid max-h-[36rem] gap-3 overflow-auto pr-1">
      {checks.map((check) => <PublicAssetSyncCheckItem key={check.checkId} check={check} />)}
    </div>
  );
}


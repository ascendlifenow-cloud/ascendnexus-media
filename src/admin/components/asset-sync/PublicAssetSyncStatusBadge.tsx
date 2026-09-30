import type { PublicAssetSyncStatus } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatAssetSyncStatus } from "../../../utils/admin/publicAssetSyncUtils";

export function PublicAssetSyncStatusBadge({ status }: { status: PublicAssetSyncStatus }) {
  const variant = status === "synced" ? "sunrise" : status === "blocked" || status === "error" || status === "mismatch" ? "pink" : "neutral";
  return <Badge variant={variant} className="px-2 py-1 text-[0.68rem]">{formatAssetSyncStatus(status)}</Badge>;
}


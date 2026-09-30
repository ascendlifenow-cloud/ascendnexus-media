import { Badge } from "../../../components/ui/Badge";
import type { MediaAssetVersionStatus } from "../../../models/media";

const labels: Record<MediaAssetVersionStatus, string> = {
  active: "Active",
  replaced: "Replaced",
  archived: "Archived",
  rollback_available: "Rollback Ready",
  deleted: "Deleted",
};

export function MediaVersionBadge({ status }: { status: MediaAssetVersionStatus }) {
  const variant = status === "active" ? "sunrise" : status === "archived" || status === "deleted" ? "pink" : "neutral";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}

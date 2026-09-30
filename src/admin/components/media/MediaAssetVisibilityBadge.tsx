import { Badge } from "../../../components/ui/Badge";
import type { MediaAssetVisibility } from "../../../models/media";

const labels: Record<MediaAssetVisibility, string> = {
  public: "Public",
  not_public: "Not Public",
  admin_only: "Admin-only",
  draft: "Draft",
  archived: "Archived",
  blocked: "Blocked",
  unassigned: "Unassigned",
  missing: "Missing",
  unknown: "Unknown",
};

export function MediaAssetVisibilityBadge({ visibility }: { visibility: MediaAssetVisibility }) {
  const variant = visibility === "public" ? "sunrise" : visibility === "blocked" || visibility === "archived" ? "pink" : visibility === "admin_only" ? "purple" : "neutral";
  return <Badge variant={variant}>{labels[visibility]}</Badge>;
}

import { Badge } from "../../../components/ui/Badge";
import type { MediaAssetAssignmentState } from "../../../models/media";

const labels: Record<MediaAssetAssignmentState, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  multi_assigned: "Multi-assigned",
  replaced: "Replaced",
  detached: "Detached",
  archived: "Archived",
};

export function MediaAssetAssignmentBadge({ state }: { state: MediaAssetAssignmentState }) {
  const variant = state === "assigned" || state === "multi_assigned" ? "sunrise" : state === "archived" ? "pink" : "neutral";
  return <Badge variant={variant}>{labels[state]}</Badge>;
}

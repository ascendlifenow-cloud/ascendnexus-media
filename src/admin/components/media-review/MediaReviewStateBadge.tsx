import { Badge } from "../../../components/ui/Badge";
import type { MediaAssignmentReviewState } from "../../../models/media";
import { formatAssignmentState } from "../../../utils/media/mediaAssignmentReviewUtils";

export function MediaReviewStateBadge({ state }: { state: MediaAssignmentReviewState }) {
  const variant = state === "assigned" ? "sunrise" : state === "assignment_failed" || state === "archived" ? "pink" : state === "suggested_assignment" ? "purple" : "neutral";
  return <Badge variant={variant}>{formatAssignmentState(state)}</Badge>;
}

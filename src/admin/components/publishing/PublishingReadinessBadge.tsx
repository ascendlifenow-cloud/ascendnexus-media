import type { PublishingReadinessState } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatPublishingStatusLabel } from "../../utils/publishingWorkflowUtils";

export function PublishingReadinessBadge({ readiness }: { readiness: PublishingReadinessState }) {
  const ready = readiness === "ready";
  return (
    <Badge variant={ready ? "glass" : readiness === "needs_review" ? "neutral" : "sunrise"} className={ready ? "text-anm-success" : undefined}>
      {formatPublishingStatusLabel(readiness)}
    </Badge>
  );
}

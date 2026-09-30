import type { PublishingPublicVisibility } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatPublicVisibilityLabel } from "../../utils/publishingWorkflowUtils";

export function PublicVisibilityBadge({ visibility }: { visibility: PublishingPublicVisibility }) {
  const isPublic = visibility === "public";
  return (
    <Badge variant={isPublic ? "glass" : visibility === "hidden" || visibility === "not_public" ? "neutral" : "sunrise"} className={isPublic ? "text-anm-success" : undefined}>
      {formatPublicVisibilityLabel(visibility)}
    </Badge>
  );
}

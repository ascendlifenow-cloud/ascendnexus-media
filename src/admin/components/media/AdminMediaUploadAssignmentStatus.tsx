import type { MediaAssetRecord } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { getMediaAssignmentStatus, getMediaPublicSafetyLabel } from "../../utils/mediaLibraryUploadUtils";

interface AdminMediaUploadAssignmentStatusProps {
  asset: MediaAssetRecord | null;
}

const labels = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  ready_for_assignment: "Ready for Assignment",
} as const;

export function AdminMediaUploadAssignmentStatus({ asset }: AdminMediaUploadAssignmentStatusProps) {
  const status = getMediaAssignmentStatus(asset);
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={status === "assigned" ? "glass" : "sunrise"}>{labels[status]}</Badge>
      {asset ? <Badge variant="neutral">{getMediaPublicSafetyLabel(asset)}</Badge> : null}
    </div>
  );
}

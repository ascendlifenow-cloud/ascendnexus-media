import { Badge } from "../../../components/ui/Badge";
import type { MediaProcessingStatus } from "../../../models/media";

const labels: Record<MediaProcessingStatus, string> = {
  pending: "Processing Pending",
  processing: "Processing",
  completed: "Processing Complete",
  failed: "Processing Failed",
  skipped: "Processing Skipped",
  retrying: "Processing Retrying",
};

export function MediaProcessingStatusBadge({ status }: { status: MediaProcessingStatus }) {
  const variant = status === "completed" ? "sunrise" : status === "failed" ? "pink" : status === "processing" ? "purple" : "glass";
  return (
    <Badge variant={variant} aria-label={`Media processing status: ${labels[status]}`}>
      {labels[status]}
    </Badge>
  );
}

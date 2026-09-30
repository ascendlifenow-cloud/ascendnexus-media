import { Badge } from "../../../components/ui/Badge";
import type { MediaUploadJobStatus } from "../../../models/media";

const labels: Record<MediaUploadJobStatus, string> = {
  queued: "Queued",
  validating: "Validating",
  validation_failed: "Validation Failed",
  ready: "Ready",
  uploading: "Uploading",
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
  retrying: "Retrying",
};

export function MediaUploadJobStatusBadge({ status }: { status: MediaUploadJobStatus }) {
  const variant = status === "completed" ? "sunrise" : status === "failed" || status === "validation_failed" ? "pink" : status === "processing" || status === "uploading" ? "purple" : "neutral";
  return (
    <Badge variant={variant} aria-label={`Upload job status: ${labels[status]}`}>
      {labels[status]}
    </Badge>
  );
}

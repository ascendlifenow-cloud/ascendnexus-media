import type { MediaProcessingJobStatusValue } from "../../../../models/media";
import { AdminStatusBadge } from "../../AdminStatusBadge";

const statusMap: Record<MediaProcessingJobStatusValue, "ready" | "planned" | "mock" | "disabled"> = {
  queued: "planned",
  delayed: "planned",
  active: "mock",
  processing: "mock",
  retrying: "mock",
  completed: "ready",
  skipped: "planned",
  failed: "disabled",
  canceled: "disabled",
  dead_letter: "disabled",
};

export function AdminProcessingStatusBadge({ status }: { status: MediaProcessingJobStatusValue }) {
  return (
    <span title={status.replace(/_/g, " ")}>
      <AdminStatusBadge status={statusMap[status] ?? "mock"} />
    </span>
  );
}

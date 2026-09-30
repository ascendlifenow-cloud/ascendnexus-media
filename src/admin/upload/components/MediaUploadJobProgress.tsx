import type { MediaUploadJob } from "../../../models/media";
import { AdminUploadProgressBar } from "./AdminUploadProgressBar";
import type { AdminUploadQueueItemStatus } from "../models/AdminUploadQueueItem";

const mapJobStatusToQueueStatus = (status: MediaUploadJob["status"]): AdminUploadQueueItemStatus => {
  if (status === "validation_failed" || status === "failed") return "failed";
  if (status === "uploaded" || status === "retrying") return "uploading";
  return status;
};

export function MediaUploadJobProgress({ job }: { job: MediaUploadJob }) {
  return (
    <div className="grid gap-2">
      <AdminUploadProgressBar
        progress={job.progress}
        status={mapJobStatusToQueueStatus(job.status)}
        indeterminate={job.status === "processing"}
      />
      <div className="flex items-center justify-between text-xs text-white/46">
        <span>{job.stage.replace(/_/g, " ")}</span>
        <span>{job.progress}%</span>
      </div>
    </div>
  );
}

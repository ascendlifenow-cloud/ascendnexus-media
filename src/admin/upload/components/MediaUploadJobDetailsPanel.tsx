import type { MediaProcessingJobStatus, MediaUploadJob } from "../../../models/media";
import { MediaProcessingStatusBadge } from "./MediaProcessingStatusBadge";
import { MediaUploadJobTimeline } from "./MediaUploadJobTimeline";

export function MediaUploadJobDetailsPanel({
  job,
  processingStatuses = [],
}: {
  job?: MediaUploadJob;
  processingStatuses?: MediaProcessingJobStatus[];
}) {
  if (!job) return null;
  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="grid gap-1 text-xs text-white/56">
        <div className="flex justify-between gap-3">
          <span>Upload Job</span>
          <span className="max-w-48 truncate font-semibold text-white/72">{job.uploadJobId}</span>
        </div>
        {job.mediaAssetId ? (
          <div className="flex justify-between gap-3">
            <span>Media Asset</span>
            <span className="max-w-48 truncate font-semibold text-white/72">{job.mediaAssetId}</span>
          </div>
        ) : null}
        {job.storageObjectId ? (
          <div className="flex justify-between gap-3">
            <span>Storage Object</span>
            <span className="max-w-48 truncate font-semibold text-white/72">{job.storageObjectId}</span>
          </div>
        ) : null}
      </div>
      {processingStatuses.length ? (
        <div className="flex flex-wrap gap-2">
          {processingStatuses.map((status) => (
            <MediaProcessingStatusBadge key={status.processingJobId} status={status.status} />
          ))}
        </div>
      ) : null}
      <MediaUploadJobTimeline job={job} />
    </div>
  );
}

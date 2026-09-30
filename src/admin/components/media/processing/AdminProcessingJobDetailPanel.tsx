import type { MediaProcessingJob } from "../../../../models/media";
import { LinkButton } from "../../../../components/ui/LinkButton";
import { AdminSectionCard } from "../../AdminSectionCard";
import { formatProcessingErrorCode, formatProcessingJobType, getProcessingRequirementState } from "../../../utils/mediaProcessingAdminUtils";
import { AdminProcessingCancelButton } from "./AdminProcessingCancelButton";
import { AdminProcessingProgress } from "./AdminProcessingProgress";
import { AdminProcessingRetryButton } from "./AdminProcessingRetryButton";
import { AdminProcessingStatusBadge } from "./AdminProcessingStatusBadge";
import { ProcessingRequirementBadge } from "./ProcessingRequirementBadge";

interface Props {
  job?: MediaProcessingJob;
  onRetry: (processingJobId: string) => void;
  onCancel: (processingJobId: string) => void;
}

const sanitizeMetadataPreview = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeMetadataPreview);
  if (!value || typeof value !== "object") return value;
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((safe, [key, entry]) => {
    const normalizedKey = key.toLowerCase();
    if (/(url|token|secret|signature|credential|authorization|password)/.test(normalizedKey)) {
      safe[key] = "[redacted]";
      return safe;
    }
    safe[key] = sanitizeMetadataPreview(entry);
    return safe;
  }, {});
};

export function AdminProcessingJobDetailPanel({ job, onRetry, onCancel }: Props) {
  return (
    <AdminSectionCard title="Job Detail" description="Selected processing job status, retry state, and safe failure details.">
      {job ? (
        <div className="grid gap-4 text-sm text-white/70">
          <div className="flex flex-wrap items-center gap-3">
            <AdminProcessingStatusBadge status={job.status} />
            <ProcessingRequirementBadge state={getProcessingRequirementState(job)} />
            <span>{job.processingJobId}</span>
          </div>
          <AdminProcessingProgress progress={job.progress} status={job.status} />
          <dl className="grid gap-3 md:grid-cols-2">
            <div><dt className="text-white/45">Type</dt><dd className="text-white">{formatProcessingJobType(job.jobType)}</dd></div>
            <div><dt className="text-white/45">Queue</dt><dd className="text-white">{job.queueName}</dd></div>
            <div><dt className="text-white/45">Attempts</dt><dd className="text-white">{job.attempts} / {job.maxAttempts}</dd></div>
            <div><dt className="text-white/45">Upload Job</dt><dd className="break-all text-white">{job.uploadJobId ?? "None"}</dd></div>
            <div><dt className="text-white/45">Asset ID</dt><dd className="break-all text-white">{job.assetId}</dd></div>
            <div><dt className="text-white/45">Storage Object</dt><dd className="break-all text-white">{job.storageObjectId}</dd></div>
            <div><dt className="text-white/45">Created</dt><dd className="text-white">{job.createdAt}</dd></div>
            <div><dt className="text-white/45">Updated</dt><dd className="text-white">{job.updatedAt}</dd></div>
            <div><dt className="text-white/45">Started</dt><dd className="text-white">{job.startedAt ?? "Not started"}</dd></div>
            <div><dt className="text-white/45">Completed/Failed</dt><dd className="text-white">{job.completedAt ?? job.failedAt ?? "Pending"}</dd></div>
          </dl>
          {job.outputs?.length ? (
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/42">Outputs</p>
              <div className="grid gap-2">
                {job.outputs.map((output) => (
                  <div key={output.outputId} className="rounded-md border border-white/10 bg-black/18 p-3">
                    <div className="flex flex-wrap justify-between gap-3">
                      <span className="font-semibold text-white">{output.outputType.replace(/_/g, " ")}</span>
                      <span className="text-white/60">{output.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      {[output.width && output.height ? `${output.width}x${output.height}` : undefined, output.durationSeconds ? `${output.durationSeconds}s` : undefined, output.mimeType, output.fileSizeBytes ? `${output.fileSizeBytes} bytes` : undefined].filter(Boolean).join(" • ") || "Output readiness metadata"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {job.input ? (
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/42">Input Summary</p>
              <p className="mt-2 break-all text-white/64">{job.input.assetType} / {job.input.mediaCategory} / {job.input.accessLevel}</p>
              <p className="mt-1 text-xs text-white/45">{job.input.requestedOutputs.join(", ") || "No requested outputs listed"}</p>
            </div>
          ) : null}
          {job.errors?.length ? <div className="rounded-anm-card border border-red-400/20 bg-red-500/10 p-3 text-red-100">[{formatProcessingErrorCode(job.errors[0])}] {job.errors.join(" ")}</div> : null}
          {job.warnings?.length ? <div className="rounded-anm-card border border-amber-300/20 bg-amber-400/10 p-3 text-amber-100">{job.warnings.join(" ")}</div> : null}
          <div className="flex flex-wrap gap-2">
            <AdminProcessingRetryButton job={job} onRetry={onRetry} />
            <AdminProcessingCancelButton job={job} onCancel={onCancel} />
            <LinkButton to={`/admin/media?assetId=${job.assetId}`} variant="ghost">Open Asset</LinkButton>
            {job.uploadJobId ? <LinkButton to={`/admin/media/processing?uploadJobId=${job.uploadJobId}`} variant="ghost">Upload Job</LinkButton> : null}
          </div>
          <div className="rounded-md border border-white/10 bg-black/18 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Safe Metadata Preview</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/60">{JSON.stringify(sanitizeMetadataPreview(job.metadata ?? {}), null, 2)}</pre>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/60">Select a processing job to inspect details.</p>
      )}
    </AdminSectionCard>
  );
}

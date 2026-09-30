import type { MediaProcessingJob } from "../../../../models/media";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";
import { formatProcessingJobType, getProcessingRequirementState } from "../../../utils/mediaProcessingAdminUtils";
import { AdminProcessingCancelButton } from "./AdminProcessingCancelButton";
import { AdminProcessingProgress } from "./AdminProcessingProgress";
import { AdminProcessingRetryButton } from "./AdminProcessingRetryButton";
import { AdminProcessingStatusBadge } from "./AdminProcessingStatusBadge";
import { ProcessingRequirementBadge } from "./ProcessingRequirementBadge";

interface Props {
  jobs: MediaProcessingJob[];
  selectedJobId?: string;
  onSelectJob: (processingJobId: string) => void;
  onRetry: (processingJobId: string) => void;
  onCancel: (processingJobId: string) => void;
}

export function AdminProcessingJobTable({ jobs, selectedJobId, onSelectJob, onRetry, onCancel }: Props) {
  return (
    <div className="overflow-hidden rounded-anm-card border border-white/10">
      <table className="hidden w-full text-left text-sm lg:table">
        <thead className="bg-white/[0.04] text-xs uppercase text-white/50">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Queue</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Attempts</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {jobs.map((job) => (
              <tr key={job.processingJobId} className={selectedJobId === job.processingJobId ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}>
                <td className="px-4 py-3">
                  <button type="button" className="text-left text-white" onClick={() => onSelectJob(job.processingJobId)}>
                    <span className="block font-medium">{job.processingJobId.slice(-10)}</span>
                    <span className="text-xs text-white/45">Priority {job.priority}</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="block max-w-44 truncate text-white">{job.assetId}</span>
                  <span className="text-xs text-white/45">{job.input?.assetType ?? "asset"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="block text-white/75">{formatProcessingJobType(job.jobType)}</span>
                  <ProcessingRequirementBadge state={getProcessingRequirementState(job)} />
                </td>
                <td className="px-4 py-3 text-white/65">{job.queueName}</td>
                <td className="px-4 py-3"><AdminProcessingStatusBadge status={job.status} /></td>
                <td className="px-4 py-3 min-w-40"><AdminProcessingProgress progress={job.progress} status={job.status} compact={false} /></td>
                <td className="px-4 py-3 text-white/70">{job.attempts}/{job.maxAttempts}</td>
                <td className="px-4 py-3 text-white/60">{job.updatedAt}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="glass" size="sm" onClick={() => onSelectJob(job.processingJobId)}>Details</Button>
                    <AdminProcessingRetryButton job={job} onRetry={onRetry} compact />
                    <AdminProcessingCancelButton job={job} onCancel={onCancel} compact />
                    <LinkButton to={`/admin/media?assetId=${job.assetId}`} variant="ghost" size="sm">Asset</LinkButton>
                  </div>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
      <div className="grid gap-3 p-3 lg:hidden">
        {jobs.map((job) => (
            <article key={job.processingJobId} className="rounded-md border border-white/10 bg-black/18 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" className="text-left" onClick={() => onSelectJob(job.processingJobId)}>
                  <h3 className="text-sm font-semibold text-white">{formatProcessingJobType(job.jobType)}</h3>
                  <p className="mt-1 text-xs text-white/45">{job.processingJobId}</p>
                </button>
                <AdminProcessingStatusBadge status={job.status} />
              </div>
              <div className="mt-3">
                <AdminProcessingProgress progress={job.progress} status={job.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ProcessingRequirementBadge state={getProcessingRequirementState(job)} />
                <span className="text-xs text-white/50">{job.queueName}</span>
                <span className="text-xs text-white/50">{job.attempts}/{job.maxAttempts} attempts</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="glass" size="sm" onClick={() => onSelectJob(job.processingJobId)}>Details</Button>
                <AdminProcessingRetryButton job={job} onRetry={onRetry} compact />
                <AdminProcessingCancelButton job={job} onCancel={onCancel} compact />
              </div>
            </article>
        ))}
      </div>
      {!jobs.length ? <p className="p-5 text-sm text-white/60">No processing jobs have been queued yet.</p> : null}
    </div>
  );
}

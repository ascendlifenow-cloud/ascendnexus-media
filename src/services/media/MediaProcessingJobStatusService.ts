import type {
  AudioProcessingJob,
  ImageProcessingJob,
  LegacyMediaProcessingJobType,
  MediaProcessingJobStatus,
  MediaProcessingStatus,
} from "../../models/media";
import { recordMediaAuditEvent } from "../admin/AdminAuditService";

const nowIso = () => new Date().toISOString();
const sanitizeMessages = (messages: readonly string[] | undefined): string[] | undefined =>
  messages?.map((message) => message.replace(/(secret|token|key|credential)=([^&\s]+)/gi, "$1=[redacted]")).filter(Boolean);

export class MediaProcessingJobStatusService {
  private statuses = new Map<string, MediaProcessingJobStatus>();

  createProcessingStatus(
    job: ImageProcessingJob | AudioProcessingJob,
    jobType: LegacyMediaProcessingJobType,
    uploadJobId?: string,
  ): MediaProcessingJobStatus {
    const status: MediaProcessingJobStatus = {
      processingJobId: "jobId" in job ? job.jobId : `${jobType}-${Date.now()}`,
      uploadJobId,
      assetId: job.assetId,
      jobType,
      status: job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : job.status === "skipped" ? "skipped" : "pending",
      progress: job.status === "completed" ? 100 : job.status === "skipped" ? 100 : 0,
      message: `${jobType.replace(/_/g, " ")} ${job.status}`,
      outputs: "generatedDerivatives" in job ? job.generatedDerivatives : job.generatedOutputs,
      errors: sanitizeMessages(job.errors),
      warnings: sanitizeMessages(job.warnings),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.status === "completed" || job.status === "failed" || job.status === "skipped" ? job.updatedAt ?? nowIso() : undefined,
      metadata: {
        sourceStoragePath: job.sourceStoragePath ?? null,
      },
    };
    this.statuses.set(status.processingJobId, status);
    return status;
  }

  updateProcessingStatus(processingJobId: string, updates: Partial<MediaProcessingJobStatus>): MediaProcessingJobStatus | null {
    const current = this.statuses.get(processingJobId);
    if (!current) return null;
    const updated: MediaProcessingJobStatus = {
      ...current,
      ...updates,
      errors: updates.errors === undefined ? current.errors : sanitizeMessages(updates.errors),
      warnings: updates.warnings === undefined ? current.warnings : sanitizeMessages(updates.warnings),
      updatedAt: nowIso(),
    };
    this.statuses.set(processingJobId, updated);
    return updated;
  }

  getProcessingStatus(processingJobId: string): MediaProcessingJobStatus | null {
    return this.statuses.get(processingJobId) ?? null;
  }

  listProcessingStatusesByAsset(assetId: string): MediaProcessingJobStatus[] {
    return [...this.statuses.values()].filter((status) => status.assetId === assetId);
  }

  markProcessingCompleted(processingJobId: string, outputs: unknown[] = []): MediaProcessingJobStatus | null {
    const status = this.updateProcessingStatus(processingJobId, { status: "completed", progress: 100, outputs, completedAt: nowIso() });
    if (status) this.recordProcessingAudit(status, "completed");
    return status;
  }

  markProcessingFailed(processingJobId: string, errors: string[]): MediaProcessingJobStatus | null {
    const status = this.updateProcessingStatus(processingJobId, { status: "failed", progress: 100, errors, completedAt: nowIso() });
    if (status) this.recordProcessingAudit(status, "failed");
    return status;
  }

  markProcessingSkipped(processingJobId: string, reason: string): MediaProcessingJobStatus | null {
    return this.updateProcessingStatus(processingJobId, { status: "skipped", progress: 100, warnings: [reason], completedAt: nowIso() });
  }

  private recordProcessingAudit(status: MediaProcessingJobStatus, state: MediaProcessingStatus): void {
    recordMediaAuditEvent({
      actionType: "custom",
      entityId: status.assetId,
      entityLabel: status.processingJobId,
      route: "/admin/media",
      summary: `Processing job ${state} for media asset "${status.assetId}"`,
      metadata: { processingJobId: status.processingJobId, jobType: status.jobType, status: state },
    });
  }
}

export const mediaProcessingJobStatusService = new MediaProcessingJobStatusService();

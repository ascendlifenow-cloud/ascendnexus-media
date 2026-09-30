import type {
  MediaFileValidationResult,
  MediaUploadJob,
  MediaUploadJobStage,
  MediaUploadJobStatus,
  MediaUploadTarget,
} from "../../models/media";
import { recordMediaAuditEvent } from "../admin/AdminAuditService";

export interface MediaUploadJobFilters {
  status?: MediaUploadJobStatus;
  targetId?: string;
  ownerId?: string;
}

const nowIso = () => new Date().toISOString();
const createUploadJobId = (): string => `upload-job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const clampProgress = (progress: number): number => Math.max(0, Math.min(100, Math.round(progress)));
const sanitizeMessages = (messages: readonly string[] | undefined): string[] | undefined =>
  messages?.map((message) => message.replace(/(secret|token|key|credential)=([^&\s]+)/gi, "$1=[redacted]")).filter(Boolean);

export class MediaUploadJobService {
  private jobs = new Map<string, MediaUploadJob>();

  createUploadJob(file: File, uploadTarget: MediaUploadTarget, metadata: Record<string, string | number | boolean | null> = {}): MediaUploadJob {
    const job: MediaUploadJob = {
      uploadJobId: createUploadJobId(),
      queueItemId: typeof metadata.queueItemId === "string" ? metadata.queueItemId : undefined,
      fileName: file.name,
      originalFileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type,
      assetType: uploadTarget.assetType,
      targetType: uploadTarget.targetType,
      targetId: uploadTarget.targetId,
      ownerType: uploadTarget.ownerType,
      ownerId: uploadTarget.ownerId,
      status: "queued",
      stage: "selection",
      progress: 0,
      createdAt: nowIso(),
      metadata,
    };
    this.jobs.set(job.uploadJobId, job);
    recordMediaAuditEvent({
      actionType: "upload",
      entityId: job.uploadJobId,
      entityLabel: job.fileName,
      route: "/admin/media",
      summary: `Upload job created for "${job.fileName}"`,
      metadata: { uploadJobId: job.uploadJobId, assetType: job.assetType, targetType: job.targetType },
    });
    return job;
  }

  updateUploadJob(uploadJobId: string, updates: Partial<MediaUploadJob>): MediaUploadJob | null {
    const current = this.jobs.get(uploadJobId);
    if (!current) return null;
    const updated: MediaUploadJob = {
      ...current,
      ...updates,
      progress: updates.progress === undefined ? current.progress : clampProgress(updates.progress),
      errors: updates.errors === undefined ? current.errors : sanitizeMessages(updates.errors),
      warnings: updates.warnings === undefined ? current.warnings : sanitizeMessages(updates.warnings),
      updatedAt: nowIso(),
    };
    this.jobs.set(uploadJobId, updated);
    return updated;
  }

  getUploadJob(uploadJobId: string): MediaUploadJob | null {
    return this.jobs.get(uploadJobId) ?? null;
  }

  listUploadJobs(filters: MediaUploadJobFilters = {}): MediaUploadJob[] {
    return [...this.jobs.values()]
      .filter((job) => (filters.status ? job.status === filters.status : true))
      .filter((job) => (filters.targetId ? job.targetId === filters.targetId : true))
      .filter((job) => (filters.ownerId ? job.ownerId === filters.ownerId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markValidationStarted(uploadJobId: string): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, { status: "validating", stage: "validation", progress: 5 });
  }

  markValidationFailed(uploadJobId: string, validationResult: MediaFileValidationResult): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, {
      status: "validation_failed",
      stage: "validation",
      progress: 100,
      validationResult,
      errors: validationResult.blockingErrors.map((message) => message.message),
      warnings: [...validationResult.warnings, ...validationResult.info].map((message) => message.message),
      completedAt: nowIso(),
    });
  }

  markUploadStarted(uploadJobId: string): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, { status: "uploading", stage: "storage_upload", progress: 35, errors: undefined });
  }

  updateUploadProgress(uploadJobId: string, progress: number): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, { status: "uploading", stage: "storage_upload", progress });
  }

  markStorageUploaded(uploadJobId: string, storageObjectId: string): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, { status: "uploaded", stage: "asset_record_creation", progress: 72, storageObjectId });
  }

  markAssetRecordCreated(uploadJobId: string, mediaAssetId: string): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, { status: "uploaded", stage: "asset_record_creation", progress: 84, mediaAssetId });
  }

  markProcessingStarted(uploadJobId: string, processingJobIds: string[], stage: MediaUploadJobStage = "image_processing"): MediaUploadJob | null {
    return this.updateUploadJob(uploadJobId, { status: "processing", stage, progress: 90, processingJobIds });
  }

  markCompleted(uploadJobId: string): MediaUploadJob | null {
    const job = this.updateUploadJob(uploadJobId, { status: "completed", stage: "complete", progress: 100, completedAt: nowIso() });
    if (job) {
      recordMediaAuditEvent({
        actionType: "upload",
        entityId: job.mediaAssetId ?? job.uploadJobId,
        entityLabel: job.fileName,
        route: "/admin/media",
        summary: `Upload job completed for "${job.fileName}"`,
        metadata: { uploadJobId: job.uploadJobId, mediaAssetId: job.mediaAssetId ?? null, storageObjectId: job.storageObjectId ?? null },
      });
    }
    return job;
  }

  markFailed(uploadJobId: string, errors: string[]): MediaUploadJob | null {
    const job = this.updateUploadJob(uploadJobId, { status: "failed", stage: "error", progress: 100, errors, completedAt: nowIso() });
    if (job) {
      recordMediaAuditEvent({
        actionType: "upload",
        entityId: job.uploadJobId,
        entityLabel: job.fileName,
        route: "/admin/media",
        summary: `Upload job failed for "${job.fileName}"`,
        metadata: { uploadJobId: job.uploadJobId, errors: sanitizeMessages(errors) ?? [] },
      });
    }
    return job;
  }

  markCanceled(uploadJobId: string): MediaUploadJob | null {
    const job = this.updateUploadJob(uploadJobId, { status: "canceled", stage: "error", progress: 0, completedAt: nowIso() });
    if (job) {
      recordMediaAuditEvent({
        actionType: "upload",
        entityId: job.uploadJobId,
        entityLabel: job.fileName,
        route: "/admin/media",
        summary: `Upload job canceled for "${job.fileName}"`,
        metadata: { uploadJobId: job.uploadJobId },
      });
    }
    return job;
  }

  retryUploadJob(uploadJobId: string): MediaUploadJob | null {
    const job = this.updateUploadJob(uploadJobId, { status: "retrying", stage: "validation", progress: 0, errors: undefined, completedAt: undefined });
    if (job) {
      recordMediaAuditEvent({
        actionType: "upload",
        entityId: job.uploadJobId,
        entityLabel: job.fileName,
        route: "/admin/media",
        summary: `Upload job retried for "${job.fileName}"`,
        metadata: { uploadJobId: job.uploadJobId },
      });
    }
    return job;
  }
}

export const mediaUploadJobService = new MediaUploadJobService();

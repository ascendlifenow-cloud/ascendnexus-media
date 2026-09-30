import type { MediaBatchUploadJob, MediaBatchUploadJobStatus } from "../../models/media";
import { recordMediaAuditEvent } from "../admin/AdminAuditService";
import { mediaUploadJobService } from "./MediaUploadJobService";

const nowIso = () => new Date().toISOString();
const createBatchJobId = (): string => `batch-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class MediaBatchUploadJobService {
  private batches = new Map<string, MediaBatchUploadJob>();

  createBatchJob(uploadJobIds: string[], metadata: Record<string, string | number | boolean | null> = {}): MediaBatchUploadJob {
    const batch: MediaBatchUploadJob = {
      batchJobId: createBatchJobId(),
      uploadJobIds,
      status: "queued",
      totalCount: uploadJobIds.length,
      queuedCount: uploadJobIds.length,
      uploadingCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      canceledCount: 0,
      progress: 0,
      createdAt: nowIso(),
      metadata,
    };
    this.batches.set(batch.batchJobId, batch);
    return batch;
  }

  getBatchJob(batchJobId: string): MediaBatchUploadJob | null {
    return this.batches.get(batchJobId) ?? null;
  }

  updateBatchProgress(batchJobId: string): MediaBatchUploadJob | null {
    const current = this.batches.get(batchJobId);
    if (!current) return null;
    const jobs = current.uploadJobIds.map((id) => mediaUploadJobService.getUploadJob(id)).filter(Boolean);
    const completedCount = jobs.filter((job) => job?.status === "completed").length;
    const failedCount = jobs.filter((job) => job?.status === "failed" || job?.status === "validation_failed").length;
    const canceledCount = jobs.filter((job) => job?.status === "canceled").length;
    const uploadingCount = jobs.filter((job) => job?.status === "uploading" || job?.status === "uploaded").length;
    const processingCount = jobs.filter((job) => job?.status === "processing").length;
    const queuedCount = jobs.filter((job) => job?.status === "queued" || job?.status === "ready" || job?.status === "validating").length;
    const resolvedCount = completedCount + failedCount + canceledCount;
    const progress = current.totalCount ? Math.round((resolvedCount / current.totalCount) * 100) : 100;
    const status = this.calculateStatus(current.totalCount, completedCount, failedCount, canceledCount, uploadingCount, processingCount);
    const updated: MediaBatchUploadJob = {
      ...current,
      status,
      queuedCount,
      uploadingCount,
      processingCount,
      completedCount,
      failedCount,
      canceledCount,
      progress,
      updatedAt: nowIso(),
      completedAt: progress === 100 ? nowIso() : current.completedAt,
    };
    this.batches.set(batchJobId, updated);
    return updated;
  }

  calculateBatchStatus(batchJobId: string): MediaBatchUploadJobStatus | null {
    return this.updateBatchProgress(batchJobId)?.status ?? null;
  }

  markBatchCompleted(batchJobId: string): MediaBatchUploadJob | null {
    const batch = this.updateBatchProgress(batchJobId);
    if (batch) {
      recordMediaAuditEvent({
        actionType: "upload",
        entityId: batch.batchJobId,
        entityLabel: "Batch upload",
        route: "/admin/media",
        summary: `Batch upload ${batch.status.replace(/_/g, " ")}`,
        metadata: { batchJobId: batch.batchJobId, completedCount: batch.completedCount, failedCount: batch.failedCount },
      });
    }
    return batch;
  }

  markBatchFailed(batchJobId: string): MediaBatchUploadJob | null {
    const current = this.batches.get(batchJobId);
    if (!current) return null;
    const updated: MediaBatchUploadJob = { ...current, status: "failed", progress: 100, updatedAt: nowIso(), completedAt: nowIso() };
    this.batches.set(batchJobId, updated);
    return updated;
  }

  cancelBatch(batchJobId: string): MediaBatchUploadJob | null {
    const current = this.batches.get(batchJobId);
    if (!current) return null;
    current.uploadJobIds.forEach((id) => mediaUploadJobService.markCanceled(id));
    const updated = this.updateBatchProgress(batchJobId);
    return updated ? { ...updated, status: "canceled" } : null;
  }

  private calculateStatus(
    totalCount: number,
    completedCount: number,
    failedCount: number,
    canceledCount: number,
    uploadingCount: number,
    processingCount: number,
  ): MediaBatchUploadJobStatus {
    if (totalCount === 0) return "completed";
    const resolvedCount = completedCount + failedCount + canceledCount;
    if (resolvedCount === totalCount) {
      if (completedCount > 0 && (failedCount > 0 || canceledCount > 0)) return "completed_with_errors";
      if (failedCount === totalCount) return "failed";
      if (canceledCount === totalCount) return "canceled";
      return "completed";
    }
    if (processingCount > 0) return "processing";
    if (uploadingCount > 0) return "uploading";
    return "queued";
  }
}

export const mediaBatchUploadJobService = new MediaBatchUploadJobService();

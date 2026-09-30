import type { MediaUploadJob, MediaUploadJobStatus, MediaUploadStage, MediaUploadTargetInput, UploadedMediaFile } from "../../models/mediaModels";
import { jsonDatabase } from "./JsonDatabase";

export class MediaUploadJobPersistenceService {
  async create(file: UploadedMediaFile, target: MediaUploadTargetInput, createdBy?: string): Promise<MediaUploadJob> {
    const now = new Date().toISOString();
    const job: MediaUploadJob = {
      uploadJobId: `upload-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: file.fileName,
      originalFileName: file.fileName,
      fileSizeBytes: file.size,
      mimeType: file.mimeType,
      assetType: target.assetType,
      targetType: target.targetType,
      targetId: target.targetId,
      ownerType: target.ownerType,
      ownerId: target.ownerId,
      status: "queued",
      stage: "validation",
      progress: 0,
      processingJobIds: [],
      errors: [],
      warnings: [],
      createdBy,
      createdAt: now,
      updatedAt: now,
      metadata: target.metadata,
    };
    await jsonDatabase.update((data) => data.mediaUploadJobs.push(job));
    return job;
  }

  async update(uploadJobId: string, patch: Partial<MediaUploadJob>): Promise<MediaUploadJob | null> {
    let updated: MediaUploadJob | null = null;
    await jsonDatabase.update((data) => {
      data.mediaUploadJobs = data.mediaUploadJobs.map((job) => {
        if (job.uploadJobId !== uploadJobId) return job;
        updated = { ...job, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
    });
    return updated;
  }

  async mark(uploadJobId: string, status: MediaUploadJobStatus, stage: MediaUploadStage, progress: number, patch: Partial<MediaUploadJob> = {}) {
    return this.update(uploadJobId, {
      ...patch,
      status,
      stage,
      progress,
      completedAt: ["completed", "failed", "canceled", "validation_failed"].includes(status) ? new Date().toISOString() : patch.completedAt,
    });
  }

  async get(uploadJobId: string): Promise<MediaUploadJob | null> {
    const data = await jsonDatabase.read();
    return data.mediaUploadJobs.find((job) => job.uploadJobId === uploadJobId) ?? null;
  }

  async list(): Promise<MediaUploadJob[]> {
    const data = await jsonDatabase.read();
    return [...data.mediaUploadJobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const mediaUploadJobPersistenceService = new MediaUploadJobPersistenceService();

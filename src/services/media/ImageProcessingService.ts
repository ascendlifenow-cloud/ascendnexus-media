import type {
  CreateMediaAssetDto,
  MediaAssetMetadataValue,
  MediaAssetRecord,
} from "../../models/admin";
import type {
  ImageAssetMetadata,
  ImageDerivative,
  ImageDerivativePlan,
  ImageProcessingJob,
  MediaStorageObject,
} from "../../models/media";
import { defaultStorageProviderConfig } from "../../config/mediaStorageConfig";
import { adminMediaService } from "../admin";
import { analyzeImageFile, analyzeImageUrl, type ImageAnalysisResult } from "../../utils/media/imageAnalysisUtils";
import { createImageDerivativePlan, createMockImageDerivatives, getImageDerivativeUrl } from "../../utils/media/imageDerivativeUtils";
import { ImageProcessingApiClient } from "./ImageProcessingApiClient";
import { mediaProcessingJobStatusService } from "./MediaProcessingJobStatusService";

export interface ImageProcessingOptions {
  file?: File;
  mockDerivativesReady?: boolean;
  useBackendProcessing?: boolean;
  uploadJobId?: string;
}

export interface MediaAssetImageProcessingResult {
  mediaAsset: MediaAssetRecord;
  job: ImageProcessingJob;
  warnings: string[];
}

const createJobId = (): string => `image-job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getAssetSourceUrl = (mediaAsset: MediaAssetRecord, storageObject?: MediaStorageObject): string =>
  storageObject?.publicUrl ?? storageObject?.signedUrl ?? mediaAsset.url;

const asMetadataValueRecord = (
  value: Record<string, unknown>,
): Record<string, MediaAssetMetadataValue> => value as Record<string, MediaAssetMetadataValue>;

export class ImageProcessingService {
  private readonly jobs = new Map<string, ImageProcessingJob>();

  constructor(
    private readonly apiClient: ImageProcessingApiClient = new ImageProcessingApiClient({
      apiBaseUrl: defaultStorageProviderConfig.uploadApiBaseUrl,
      enabled: Boolean(defaultStorageProviderConfig.uploadApiBaseUrl),
    }),
  ) {}

  async analyzeImage(fileOrUrl: File | string | null | undefined): Promise<ImageAnalysisResult> {
    if (fileOrUrl instanceof File) return analyzeImageFile(fileOrUrl);
    if (typeof fileOrUrl === "string") return analyzeImageUrl(fileOrUrl);
    return { success: false, errors: ["Image file or URL is required."] };
  }

  createDerivativePlan(assetType: MediaAssetRecord["assetType"], metadata?: ImageAssetMetadata | null): ImageDerivativePlan {
    return createImageDerivativePlan(assetType, metadata);
  }

  async createProcessingJob(
    mediaAsset: MediaAssetRecord | CreateMediaAssetDto | null | undefined,
    storageObject: MediaStorageObject | null | undefined,
    options: ImageProcessingOptions = {},
  ): Promise<ImageProcessingJob> {
    if (!mediaAsset) throw new Error("Media asset is required for image processing.");
    const assetId = "assetId" in mediaAsset && mediaAsset.assetId ? mediaAsset.assetId : `pending-${Date.now()}`;
    const sourceUrl = getAssetSourceUrl(mediaAsset as MediaAssetRecord, storageObject ?? undefined);
    if (!sourceUrl) throw new Error("Image source URL is required for image processing.");

    const analysis = await this.analyzeImage(options.file ?? sourceUrl);
    const metadata = analysis.metadata ?? {
      width: 0,
      height: 0,
      aspectRatio: 0,
      orientation: "unknown" as const,
      createdAt: new Date().toISOString(),
      metadata: { analysisSkipped: true },
    };
    const plan = this.createDerivativePlan(mediaAsset.assetType, metadata);
    const generatedDerivatives = createMockImageDerivatives(
      plan,
      sourceUrl,
      storageObject?.storagePath,
      metadata,
      options.mockDerivativesReady ?? false,
    );
    const job: ImageProcessingJob = {
      jobId: createJobId(),
      assetId,
      storageObjectId: storageObject?.storageObjectId,
      sourceUrl,
      sourceStoragePath: storageObject?.storagePath,
      status: analysis.success ? "pending" : "skipped",
      requestedDerivatives: plan.derivatives,
      generatedDerivatives,
      metadata,
      errors: analysis.errors,
      warnings: [
        ...(analysis.warnings ?? []),
        ...(analysis.success ? ["Derivative files are planned for future backend/CDN processing."] : ["Image analysis did not complete; upload remains valid."]),
      ],
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.jobId, job);
    mediaProcessingJobStatusService.createProcessingStatus(job, "image_processing", options.uploadJobId);
    return job;
  }

  async processImageDerivatives(job: ImageProcessingJob): Promise<ImageProcessingJob> {
    const started: ImageProcessingJob = { ...job, status: "processing", updatedAt: new Date().toISOString() };
    this.jobs.set(started.jobId, started);
    mediaProcessingJobStatusService.updateProcessingStatus(started.jobId, { status: "processing", progress: 35, message: "Image processing started." });
    if (this.apiClient.isConfigured()) {
      try {
        const processed = await this.apiClient.createProcessingJob(started);
        this.jobs.set(processed.jobId, processed);
        mediaProcessingJobStatusService.markProcessingCompleted(processed.jobId, processed.generatedDerivatives);
        return processed;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image processing API failed.";
        const failed: ImageProcessingJob = {
          ...started,
          status: "failed",
          errors: [...(started.errors ?? []), message],
          warnings: [...(started.warnings ?? []), "Backend image processing is unavailable; planned derivatives remain as fallback metadata."],
          updatedAt: new Date().toISOString(),
        };
        this.jobs.set(failed.jobId, failed);
        mediaProcessingJobStatusService.markProcessingFailed(failed.jobId, failed.errors ?? [message]);
        return failed;
      }
    }

    const completed: ImageProcessingJob = {
      ...started,
      status: started.errors?.length ? "skipped" : "completed",
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(completed.jobId, completed);
    if (completed.status === "completed") {
      mediaProcessingJobStatusService.markProcessingCompleted(completed.jobId, completed.generatedDerivatives);
    } else {
      mediaProcessingJobStatusService.markProcessingSkipped(completed.jobId, "Image processing skipped; derivative metadata remains planned.");
    }
    return completed;
  }

  async updateMediaAssetWithImageMetadata(
    assetId: string,
    imageMetadata: ImageAssetMetadata,
    derivatives: ImageDerivative[],
    job?: ImageProcessingJob,
  ): Promise<MediaAssetRecord | null> {
    const current = await adminMediaService.getMediaAsset(assetId);
    if (!current.ok) return null;
    const thumbnailUrl = getImageDerivativeUrl(derivatives, ["thumbnail", "card"], current.data.thumbnailUrl ?? current.data.url);
    const largeUrl = getImageDerivativeUrl(derivatives, ["feature", "hero", "banner", "social", "card"], current.data.largeUrl ?? current.data.url);
    const metadata = asMetadataValueRecord({
      ...(current.data.metadata ?? {}),
      image: imageMetadata,
      derivatives,
      processing: job ? {
        jobId: job.jobId,
        status: job.status,
        requestedDerivativeCount: job.requestedDerivatives.length,
        generatedDerivativeCount: job.generatedDerivatives.length,
        updatedAt: job.updatedAt ?? job.createdAt,
      } : undefined,
    });
    const updated = await adminMediaService.updateMediaAsset(assetId, {
      thumbnailUrl,
      largeUrl,
      metadata,
    });
    return updated.ok ? updated.data : null;
  }

  async processMediaAssetImage(
    mediaAsset: MediaAssetRecord,
    storageObject: MediaStorageObject,
    options: ImageProcessingOptions = {},
  ): Promise<MediaAssetImageProcessingResult> {
    const job = await this.createProcessingJob(mediaAsset, storageObject, options);
    const processedJob = await this.processImageDerivatives(job);
    const updatedAsset = await this.updateMediaAssetWithImageMetadata(
      mediaAsset.assetId,
      processedJob.metadata,
      processedJob.generatedDerivatives,
      processedJob,
    );
    return {
      mediaAsset: updatedAsset ?? mediaAsset,
      job: processedJob,
      warnings: processedJob.warnings ?? [],
    };
  }

  getImageProcessingJob(jobId: string): ImageProcessingJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  async retryImageProcessing(jobId: string): Promise<ImageProcessingJob | null> {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    if (this.apiClient.isConfigured()) {
      const retried = await this.apiClient.retryProcessingJob(jobId);
      if (retried) {
        this.jobs.set(retried.jobId, retried);
        return retried;
      }
    }
    const next: ImageProcessingJob = {
      ...existing,
      status: "pending",
      errors: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, next);
    return this.processImageDerivatives(next);
  }

  skipImageProcessing(jobId: string): ImageProcessingJob | null {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    const skipped: ImageProcessingJob = {
      ...existing,
      status: "skipped",
      updatedAt: new Date().toISOString(),
      warnings: [...(existing.warnings ?? []), "Image processing was skipped."],
    };
    this.jobs.set(jobId, skipped);
    return skipped;
  }
}

export const imageProcessingService = new ImageProcessingService();

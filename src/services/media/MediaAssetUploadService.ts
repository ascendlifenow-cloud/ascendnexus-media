import type {
  CreateMediaAssetDto,
  MediaAssetMetadataValue,
  MediaAssetOwnerType,
  MediaAssetStatus,
} from "../../models/admin";
import type {
  AudioProcessingJob,
  ImageProcessingJob,
  MediaAccessLevel,
  MediaAssetUploadOptions,
  MediaAssetUploadStatus,
  MediaFileValidationResult,
  MediaStorageObject,
  MediaUploadResult,
  MediaUploadTarget,
} from "../../models/media";
import { sanitizeFileName } from "../../utils/media/fileNameUtils";
import { shouldAttemptDirectUpload } from "../../utils/media/uploadStrategyUtils";
import { isAudioUploadAssetType, isImageUploadAssetType } from "../../utils/media/mediaTypeUtils";
import { adminMediaService } from "../admin";
import { recordMediaAuditEvent } from "../admin/AdminAuditService";
import { mediaStorageService } from "../storage";
import { uploadSecurityService } from "../security";
import { audioProcessingService } from "./AudioProcessingService";
import { imageProcessingService } from "./ImageProcessingService";
import { mediaUploadJobService } from "./MediaUploadJobService";
import { mediaValidationService } from "./MediaValidationService";
import { directMediaUploadService } from "./DirectMediaUploadService";

const terminalStatuses = new Set<MediaAssetUploadStatus["status"]>([
  "validation_failed",
  "completed",
  "failed",
  "canceled",
]);

const isTerminalUploadStatus = (status: MediaAssetUploadStatus["status"]): boolean => terminalStatuses.has(status);

const getErrorMessage = (error: unknown): string => uploadSecurityService.sanitizeUploadError(error instanceof Error ? error.message : error).message;

const toMessages = (validationResult: Pick<MediaFileValidationResult, "blockingErrors" | "warnings" | "info">) => ({
  errors: validationResult.blockingErrors.map((message) => message.message),
  warnings: [...validationResult.warnings, ...validationResult.info].map((message) => message.message),
});

const createUploadId = (): string => `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const cleanTitleFromFileName = (fileName: string): string => {
  const withoutExtension = sanitizeFileName(fileName).replace(/\.[a-z0-9]+$/i, "");
  return withoutExtension.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || fileName;
};

const getStorageUrl = (storageObject: MediaStorageObject): string =>
  storageObject.publicUrl ?? storageObject.signedUrl ?? storageObject.storagePath;

const getUploadOwnerType = (uploadTarget: MediaUploadTarget): MediaAssetOwnerType => {
  if (uploadTarget.ownerType) return uploadTarget.ownerType;
  if (uploadTarget.targetType === "media_library") return "media_library";
  if (uploadTarget.targetType === "homepage" || uploadTarget.targetType === "site_config" || uploadTarget.targetType === "seo_metadata" || uploadTarget.targetType === "social_metadata") {
    return "site";
  }
  if (uploadTarget.targetType === "artist" || uploadTarget.targetType === "release" || uploadTarget.targetType === "gallery") {
    return uploadTarget.targetType;
  }
  return "custom";
};

const toUploadTargetMetadata = (
  metadata: Record<string, MediaAssetMetadataValue>,
): Record<string, string | number | boolean | null> =>
  Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => {
      const value = entry[1];
      return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  );

const shouldUseBackendUploadApi = (): boolean => {
  const config = mediaStorageService.getStorageConfig();
  return config.provider === "custom" && config.uploadApiBaseUrl !== undefined;
};

const getBackendUploadHeaders = (): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseBackendUploadResponse = async (response: Response): Promise<{
  success?: boolean;
  uploadJob?: { uploadJobId?: string };
  mediaAsset?: NonNullable<MediaUploadResult["mediaAsset"]>;
  storageObject?: MediaStorageObject;
  publicUrl?: string;
  warnings?: string[];
  errors?: string[];
  error?: { message?: string };
  metadata?: Record<string, unknown>;
}> => {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
    try {
      return rawBody.trim() ? JSON.parse(rawBody) : {};
    } catch {
      return {
        success: false,
        errors: [`Backend upload returned invalid JSON with status ${response.status}.`],
      };
    }
  }

  const preview = rawBody.replace(/\s+/g, " ").trim().slice(0, 140);
  return {
    success: false,
    errors: [
      `Backend upload returned ${contentType || "a non-JSON response"} with status ${response.status}${preview ? `: ${preview}` : "."}`,
    ],
  };
};

const toBackendMediaUploadResult = (payload: {
  success?: boolean;
  uploadJob?: { uploadJobId?: string };
  mediaAsset?: NonNullable<MediaUploadResult["mediaAsset"]>;
  storageObject?: MediaStorageObject;
  publicUrl?: string;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown>;
}): MediaUploadResult => ({
  success: payload.success === true,
  assetId: payload.mediaAsset?.assetId,
  storageObjectId: payload.storageObject?.storageObjectId,
  mediaAsset: payload.mediaAsset,
  storageObject: payload.storageObject,
  publicUrl: payload.publicUrl ?? payload.storageObject?.publicUrl,
  warnings: payload.warnings,
  errors: payload.errors,
  metadata: {
    ...(payload.metadata ?? {}),
    uploadJobId: payload.uploadJob?.uploadJobId ?? null,
    backendPersistent: true,
  },
});

export class MediaAssetUploadService {
  async validateBeforeUpload(
    file: File,
    uploadTarget: MediaUploadTarget,
  ): Promise<MediaFileValidationResult> {
    return mediaValidationService.validateFile(file, uploadTarget);
  }

  async uploadMediaAsset(
    file: File | null | undefined,
    uploadTarget: MediaUploadTarget | null | undefined,
    options: MediaAssetUploadOptions = {},
  ): Promise<MediaUploadResult> {
    const uploadId = createUploadId();
    const fileName = file?.name ?? "Unknown file";

    if (!file || !uploadTarget) {
      const errors = [!file ? "A file is required." : "", !uploadTarget ? "An upload target is required." : ""].filter(Boolean);
      this.emitStatus(uploadId, fileName, "failed", 100, "error", options, { errors });
      this.recordUploadAudit("failed", fileName, uploadTarget, { errors });
      return { success: false, errors };
    }

    const existingUploadJobId = typeof options.metadata?.uploadJobId === "string" ? options.metadata.uploadJobId : undefined;
    const uploadJob = existingUploadJobId
      ? mediaUploadJobService.getUploadJob(existingUploadJobId) ?? mediaUploadJobService.createUploadJob(file, uploadTarget, {
        queueItemId: typeof options.metadata?.queueItemId === "string" ? options.metadata.queueItemId : null,
        uploadJobId: existingUploadJobId,
        source: "admin_upload",
      })
      : mediaUploadJobService.createUploadJob(file, uploadTarget, {
        queueItemId: typeof options.metadata?.queueItemId === "string" ? options.metadata.queueItemId : null,
        source: "admin_upload",
      });

    try {
      mediaUploadJobService.markValidationStarted(uploadJob.uploadJobId);
      this.emitStatus(uploadId, file.name, "validating", 5, "validation", options, {
        message: "Validating file before upload.",
        metadata: { uploadJobId: uploadJob.uploadJobId },
      });

      const validationResult = await this.validateBeforeUpload(file, uploadTarget);
      const validationMessages = toMessages(validationResult);
      const sanitizedFileName = typeof validationResult.metadata?.sanitizedFileName === "string"
        ? validationResult.metadata.sanitizedFileName
        : uploadSecurityService.sanitizeFileName(file.name);

      if (!validationResult.valid) {
        mediaUploadJobService.markValidationFailed(uploadJob.uploadJobId, validationResult);
        this.emitStatus(uploadId, file.name, "validation_failed", 100, "validation", options, {
          errors: validationMessages.errors,
          warnings: validationMessages.warnings,
          metadata: { validationValid: false, uploadJobId: uploadJob.uploadJobId },
        });
        this.recordUploadAudit("validation_failed", file.name, uploadTarget, {
          errors: validationMessages.errors,
          warnings: validationMessages.warnings,
        });
        return {
          success: false,
          errors: validationMessages.errors,
          warnings: validationMessages.warnings,
          metadata: {
            validationValid: false,
            uploadJobId: uploadJob.uploadJobId,
            validationErrorCount: validationMessages.errors.length,
            validationWarningCount: validationMessages.warnings.length,
            securityBlocked: validationResult.metadata?.securityBlocked ?? false,
            sanitizedFileName,
          },
        };
      }

      this.recordUploadAudit("started", file.name, uploadTarget);
      mediaUploadJobService.markUploadStarted(uploadJob.uploadJobId);
      this.emitStatus(uploadId, file.name, "uploading", 35, "storage", options, {
        warnings: validationMessages.warnings,
        metadata: { validationValid: true, uploadJobId: uploadJob.uploadJobId },
      });

      if (shouldUseBackendUploadApi()) {
        if (shouldAttemptDirectUpload(file, uploadTarget)) {
          const directSession = await directMediaUploadService.createUploadSession(file, uploadTarget, {
            ...options,
            metadata: { ...(options.metadata ?? {}), frontendUploadJobId: uploadJob.uploadJobId },
          });
          if (directSession.success && directSession.uploadStrategy !== "backend_proxy") {
            const directResult = await directMediaUploadService.uploadFile(file, directSession, {
              ...options,
              onProgress: (progress) => {
                mediaUploadJobService.updateUploadProgress(uploadJob.uploadJobId, progress);
                options.onProgress?.(progress);
              },
            });
            if (!directResult.success) {
              mediaUploadJobService.markFailed(uploadJob.uploadJobId, directResult.errors ?? ["Direct upload failed."]);
              this.emitStatus(uploadId, file.name, "failed", 100, "storage", options, {
                errors: directResult.errors,
                warnings: directResult.warnings,
              });
              this.recordUploadAudit("failed", file.name, uploadTarget, directResult);
              return directResult;
            }
            mediaUploadJobService.markStorageUploaded(uploadJob.uploadJobId, directResult.storageObjectId ?? "");
            if (directResult.assetId) mediaUploadJobService.markAssetRecordCreated(uploadJob.uploadJobId, directResult.assetId);
            mediaUploadJobService.markCompleted(uploadJob.uploadJobId);
            this.emitStatus(uploadId, file.name, "completed", 100, "complete", options, {
              warnings: directResult.warnings,
              metadata: directResult.metadata,
            });
            this.recordUploadAudit("completed", file.name, uploadTarget, directResult);
            return this.normalizeUploadResult({
              ...directResult,
              warnings: [...validationMessages.warnings, ...(directResult.warnings ?? [])],
              metadata: {
                ...(directResult.metadata ?? {}),
                frontendUploadJobId: uploadJob.uploadJobId,
                directUploadAttempted: true,
              },
            });
          }
        }
        const backendResult = await this.uploadThroughBackendApi(file, uploadTarget, options, uploadJob.uploadJobId, validationMessages.warnings);
        if (!backendResult.success) {
          mediaUploadJobService.markFailed(uploadJob.uploadJobId, backendResult.errors ?? ["Backend upload failed."]);
          this.emitStatus(uploadId, file.name, "failed", 100, "storage", options, {
            errors: backendResult.errors,
            warnings: backendResult.warnings,
          });
          this.recordUploadAudit("failed", file.name, uploadTarget, backendResult);
          return backendResult;
        }
        mediaUploadJobService.markStorageUploaded(uploadJob.uploadJobId, backendResult.storageObjectId ?? "");
        if (backendResult.assetId) mediaUploadJobService.markAssetRecordCreated(uploadJob.uploadJobId, backendResult.assetId);
        mediaUploadJobService.markCompleted(uploadJob.uploadJobId);
        this.emitStatus(uploadId, file.name, "completed", 100, "complete", options, {
          warnings: backendResult.warnings,
          metadata: backendResult.metadata,
        });
        this.recordUploadAudit("completed", file.name, uploadTarget, backendResult);
        return this.normalizeUploadResult(backendResult);
      }

      const storageAccessLevel: MediaAccessLevel = options.accessLevel ?? uploadTarget.accessLevel ?? "admin_only";
      const sanitizedUploadMetadata = uploadSecurityService.sanitizeUploadMetadata({
        ...(uploadTarget.metadata ?? {}),
        sanitizedFileName,
        securitySafe: validationResult.metadata?.securitySafe ?? true,
        securityCheckCount: validationResult.metadata?.securityCheckCount ?? null,
        scanStatus: validationResult.metadata?.scanStatus ?? null,
      });
      const storageTarget: MediaUploadTarget = {
        ...uploadTarget,
        accessLevel: storageAccessLevel,
        metadata: toUploadTargetMetadata(sanitizedUploadMetadata),
      };
      const storageResult = await mediaStorageService.uploadToStorage(file, storageTarget, {
        createMediaAsset: false,
        accessLevel: storageAccessLevel,
        title: options.title,
        description: options.description,
        altText: options.altText,
        credit: options.credit,
        metadata: toUploadTargetMetadata(sanitizedUploadMetadata),
        onProgress: (progress) => {
          mediaUploadJobService.updateUploadProgress(uploadJob.uploadJobId, progress);
          options.onProgress?.(progress);
        },
      });

      if (!storageResult.success || !storageResult.storageObject) {
        const errors = storageResult.errors?.length ? storageResult.errors : ["File storage failed."];
        mediaUploadJobService.markFailed(uploadJob.uploadJobId, errors);
        this.emitStatus(uploadId, file.name, "failed", 100, "storage", options, {
          errors,
          warnings: validationMessages.warnings,
        });
        this.recordUploadAudit("failed", file.name, uploadTarget, { errors });
        return {
          ...storageResult,
          success: false,
          errors,
          warnings: [...validationMessages.warnings, ...(storageResult.warnings ?? [])],
          metadata: {
            ...(storageResult.metadata ?? {}),
            validationValid: true,
            uploadJobId: uploadJob.uploadJobId,
            uploadStage: "storage",
            sanitizedFileName,
          },
        };
      }

      mediaUploadJobService.markStorageUploaded(uploadJob.uploadJobId, storageResult.storageObject.storageObjectId);
      if (options.generateAssetRecord === false) {
        mediaUploadJobService.markCompleted(uploadJob.uploadJobId);
        const result = this.normalizeUploadResult({
          ...storageResult,
          success: true,
          warnings: [...validationMessages.warnings, ...(storageResult.warnings ?? [])],
          metadata: {
            ...(storageResult.metadata ?? {}),
            validationValid: true,
            uploadJobId: uploadJob.uploadJobId,
            assetRecordCreated: false,
            sanitizedFileName,
          },
        });
        this.emitStatus(uploadId, file.name, "completed", 100, "complete", options, {
          warnings: result.warnings,
          metadata: result.metadata,
        });
        this.recordUploadAudit("completed", file.name, uploadTarget, result);
        return result;
      }

      this.emitStatus(uploadId, file.name, "creating_asset", 82, "asset_record", options, {
        warnings: validationMessages.warnings,
      });

      const assetPayload = this.createMediaAssetFromUpload(file, storageTarget, storageResult.storageObject, options);
      const assetResult = await adminMediaService.createMediaAsset(assetPayload);

      if (!assetResult.ok) {
        const errors = [assetResult.error.message];
        mediaUploadJobService.markFailed(uploadJob.uploadJobId, errors);
        this.emitStatus(uploadId, file.name, "failed", 100, "asset_record", options, {
          errors,
          warnings: validationMessages.warnings,
        });
        this.recordUploadAudit("failed", file.name, uploadTarget, { errors, storageObjectId: storageResult.storageObject.storageObjectId });
        return this.normalizeUploadResult({
          success: false,
          storageObjectId: storageResult.storageObject.storageObjectId,
          storageObject: storageResult.storageObject,
          errors,
          warnings: validationMessages.warnings,
          metadata: {
            validationValid: true,
            uploadJobId: uploadJob.uploadJobId,
            uploadStage: "asset_record",
            storageObjectId: storageResult.storageObject.storageObjectId,
            sanitizedFileName,
          },
        });
      }

      const mediaAsset = assetResult.data;
      mediaUploadJobService.markAssetRecordCreated(uploadJob.uploadJobId, mediaAsset.assetId);
      const imageProcessing = await this.processUploadedImageAsset(file, mediaAsset, storageResult.storageObject, uploadTarget, uploadJob.uploadJobId);
      const imageProcessedAsset = imageProcessing.mediaAsset ?? mediaAsset;
      if (imageProcessing.job) mediaUploadJobService.markProcessingStarted(uploadJob.uploadJobId, [imageProcessing.job.jobId], "image_processing");
      const audioProcessing = await this.processUploadedAudioAsset(file, imageProcessedAsset, storageResult.storageObject, uploadTarget, options, uploadJob.uploadJobId);
      const processingJobIds = [imageProcessing.job?.jobId, audioProcessing.job?.jobId].filter(Boolean) as string[];
      if (audioProcessing.job) mediaUploadJobService.markProcessingStarted(uploadJob.uploadJobId, processingJobIds, "audio_processing");
      const finalMediaAsset = audioProcessing.mediaAsset ?? imageProcessedAsset;
      mediaUploadJobService.markCompleted(uploadJob.uploadJobId);
      const completeResult = this.normalizeUploadResult({
        ...storageResult,
        success: true,
        assetId: finalMediaAsset.assetId,
        mediaAsset: finalMediaAsset,
        publicUrl: storageResult.storageObject.publicUrl,
        warnings: [...validationMessages.warnings, ...(storageResult.warnings ?? []), ...imageProcessing.warnings, ...audioProcessing.warnings],
        metadata: {
          ...(storageResult.metadata ?? {}),
          validationValid: true,
          uploadJobId: uploadJob.uploadJobId,
          assetRecordCreated: true,
          assetId: finalMediaAsset.assetId,
          storageObjectId: storageResult.storageObject.storageObjectId,
          sanitizedFileName,
          ...(imageProcessing.job ? {
            imageProcessingJobId: imageProcessing.job.jobId,
            imageProcessingStatus: imageProcessing.job.status,
          } : {}),
          ...(audioProcessing.job ? {
            audioProcessingJobId: audioProcessing.job.jobId,
            audioProcessingStatus: audioProcessing.job.status,
            audioDurationSeconds: audioProcessing.job.metadata.durationSeconds ?? null,
            audioPublicPlaybackAllowed: audioProcessing.job.metadata.publicPlaybackAllowed,
            waveformStatus: audioProcessing.waveformStatus ?? null,
          } : {}),
        },
      });

      this.emitStatus(uploadId, file.name, "completed", 100, "complete", options, {
        warnings: completeResult.warnings,
        metadata: completeResult.metadata,
      });
      this.recordUploadAudit("completed", file.name, uploadTarget, completeResult);
      return completeResult;
    } catch (error) {
      mediaUploadJobService.markFailed(uploadJob.uploadJobId, [getErrorMessage(error)]);
      return this.handleUploadFailure(file, uploadTarget, error, uploadId, options);
    }
  }

  async retryUpload(
    file: File,
    uploadTarget: MediaUploadTarget,
    options: MediaAssetUploadOptions = {},
  ): Promise<MediaUploadResult> {
    return this.uploadMediaAsset(file, uploadTarget, options);
  }

  createMediaAssetFromUpload(
    file: File,
    uploadTarget: MediaUploadTarget,
    storageObject: MediaStorageObject,
    options: MediaAssetUploadOptions = {},
  ): CreateMediaAssetDto {
    const url = getStorageUrl(storageObject);
    const status: MediaAssetStatus = options.status ?? "draft";
    const metadata: Record<string, MediaAssetMetadataValue> = {
      ...uploadSecurityService.sanitizeUploadMetadata(uploadTarget.metadata),
      ...uploadSecurityService.sanitizeUploadMetadata(options.metadata),
      originalFileName: file.name,
      sanitizedFileName: uploadSecurityService.sanitizeFileName(file.name),
      uploadTarget: {
        targetType: uploadTarget.targetType,
        targetId: uploadTarget.targetId ?? null,
        intendedUse: uploadTarget.intendedUse,
        ownerType: uploadTarget.ownerType ?? null,
        ownerId: uploadTarget.ownerId ?? null,
      },
      storage: {
        storageObjectId: storageObject.storageObjectId,
        provider: storageObject.provider,
        bucket: storageObject.bucket ?? null,
        storagePath: storageObject.storagePath,
        accessLevel: storageObject.accessLevel,
        status: storageObject.status,
        checksum: storageObject.checksum ?? null,
        publicUrl: storageObject.publicUrl ?? null,
        signedUrlAvailable: Boolean(storageObject.signedUrl),
      },
    };

    return {
      ownerType: getUploadOwnerType(uploadTarget),
      ownerId: uploadTarget.ownerId ?? uploadTarget.targetId ?? "unassigned",
      assetType: uploadTarget.assetType,
      title: options.title?.trim() || cleanTitleFromFileName(file.name),
      description: options.description,
      url,
      thumbnailUrl: storageObject.mediaCategory === "image" ? url : undefined,
      largeUrl: storageObject.mediaCategory === "image" ? url : undefined,
      altText: options.altText,
      credit: options.credit,
      status,
      sortOrder: options.sortOrder,
      metadata,
    };
  }

  normalizeUploadResult(result: MediaUploadResult): MediaUploadResult {
    return {
      ...result,
      errors: result.errors?.filter(Boolean),
      warnings: result.warnings?.filter(Boolean),
      metadata: result.metadata,
    };
  }

  private async uploadThroughBackendApi(
    file: File,
    uploadTarget: MediaUploadTarget,
    options: MediaAssetUploadOptions,
    uploadJobId: string,
    validationWarnings: string[],
  ): Promise<MediaUploadResult> {
    const config = mediaStorageService.getStorageConfig();
    if (config.uploadApiBaseUrl === undefined) return { success: false, errors: ["Backend upload API is not configured."] };
    const apiBase = config.uploadApiBaseUrl.replace(/\/+$/, "");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetType", uploadTarget.targetType);
    if (uploadTarget.targetId) formData.append("targetId", uploadTarget.targetId);
    if (uploadTarget.ownerType) formData.append("ownerType", uploadTarget.ownerType);
    if (uploadTarget.ownerId) formData.append("ownerId", uploadTarget.ownerId);
    formData.append("assetType", uploadTarget.assetType);
    formData.append("intendedUse", uploadTarget.intendedUse);
    formData.append("accessLevel", options.accessLevel ?? uploadTarget.accessLevel ?? "admin_only");
    if (options.title) formData.append("title", options.title);
    if (options.description) formData.append("description", options.description);
    if (options.altText) formData.append("altText", options.altText);
    if (options.credit) formData.append("credit", options.credit);
    if (typeof options.sortOrder === "number") formData.append("sortOrder", String(options.sortOrder));
    formData.append("metadata", JSON.stringify(uploadSecurityService.sanitizeUploadMetadata({
      ...(uploadTarget.metadata ?? {}),
      ...(options.metadata ?? {}),
      uploadJobId,
      frontendValidationWarnings: validationWarnings.join("; "),
    })));

    const response = await fetch(`${apiBase}/api/admin/media/upload`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
      credentials: "include",
      body: formData,
    });
    const payload = await parseBackendUploadResponse(response);
    if (!response.ok) {
      return {
        success: false,
        warnings: payload.warnings,
        errors: payload.errors ?? [payload.error?.message ?? `Backend upload failed with status ${response.status}.`],
        metadata: { backendPersistent: true, uploadJobId },
      };
    }
    const result = toBackendMediaUploadResult(payload);
    return {
      ...result,
      warnings: [...validationWarnings, ...(result.warnings ?? [])],
      metadata: {
        ...(result.metadata ?? {}),
        frontendUploadJobId: uploadJobId,
      },
    };
  }

  private async processUploadedImageAsset(
    file: File,
    mediaAsset: NonNullable<MediaUploadResult["mediaAsset"]>,
    storageObject: MediaStorageObject,
    uploadTarget: MediaUploadTarget,
    uploadJobId?: string,
  ): Promise<{ mediaAsset?: NonNullable<MediaUploadResult["mediaAsset"]>; job?: ImageProcessingJob; warnings: string[] }> {
    if (!isImageUploadAssetType(uploadTarget.assetType) || storageObject.mediaCategory !== "image") {
      return { warnings: [] };
    }
    try {
      const result = await imageProcessingService.processMediaAssetImage(mediaAsset, storageObject, {
        file,
        mockDerivativesReady: false,
        uploadJobId,
      });
      return {
        mediaAsset: result.mediaAsset,
        job: result.job,
        warnings: result.warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image processing setup failed.";
      return {
        mediaAsset,
        warnings: [`Image processing was skipped: ${message}`],
      };
    }
  }

  private async processUploadedAudioAsset(
    file: File,
    mediaAsset: NonNullable<MediaUploadResult["mediaAsset"]>,
    storageObject: MediaStorageObject,
    uploadTarget: MediaUploadTarget,
    options: MediaAssetUploadOptions,
    uploadJobId?: string,
  ): Promise<{
    mediaAsset?: NonNullable<MediaUploadResult["mediaAsset"]>;
    job?: AudioProcessingJob;
    waveformStatus?: string;
    warnings: string[];
  }> {
    if (!isAudioUploadAssetType(uploadTarget.assetType) || storageObject.mediaCategory !== "audio") {
      return { warnings: [] };
    }
    try {
      const result = await audioProcessingService.processMediaAssetAudio(mediaAsset, storageObject, {
        file,
        mockOutputsReady: false,
        uploadJobId,
        publicPlaybackAllowed: uploadTarget.assetType === "full_song" ? false : Boolean(options.metadata?.publicPlaybackAllowed ?? uploadTarget.metadata?.publicPlaybackAllowed ?? uploadTarget.assetType === "audio_preview"),
      });
      return {
        mediaAsset: result.mediaAsset,
        job: result.job,
        waveformStatus: result.waveform.status,
        warnings: result.warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audio processing setup failed.";
      return {
        mediaAsset,
        warnings: [`Audio processing was skipped: ${message}`],
      };
    }
  }

  handleUploadFailure(
    file: File | null | undefined,
    uploadTarget: MediaUploadTarget | null | undefined,
    error: unknown,
    uploadId: string = createUploadId(),
    options: MediaAssetUploadOptions = {},
  ): MediaUploadResult {
    const message = getErrorMessage(error);
    const fileName = file?.name ?? "Unknown file";
    this.emitStatus(uploadId, fileName, "failed", 100, "error", options, { errors: [message] });
    this.recordUploadAudit("failed", fileName, uploadTarget, { errors: [message] });
    return {
      success: false,
      errors: [message],
      metadata: { uploadStage: "error" },
    };
  }

  private emitStatus(
    uploadId: string,
    fileName: string,
    status: MediaAssetUploadStatus["status"],
    progress: number,
    stage: MediaAssetUploadStatus["stage"],
    options: MediaAssetUploadOptions,
    details: Partial<Omit<MediaAssetUploadStatus, "uploadId" | "fileName" | "status" | "progress" | "stage">> = {},
  ): void {
    const nextStatus: MediaAssetUploadStatus = {
      uploadId,
      fileName,
      status,
      progress,
      stage,
      ...details,
    };
    options.onStatusChange?.(nextStatus);
    if (!isTerminalUploadStatus(status)) options.onProgress?.(progress);
    if (status === "completed") options.onProgress?.(100);
  }

  private recordUploadAudit(
    state: "started" | "validation_failed" | "failed" | "completed",
    fileName: string,
    uploadTarget: MediaUploadTarget | null | undefined,
    metadata: unknown = {},
  ): void {
    recordMediaAuditEvent({
      actionType: state === "started" || state === "completed" ? "upload" : "validate",
      entityId: uploadTarget?.ownerId ?? uploadTarget?.targetId ?? "unassigned",
      entityLabel: fileName,
      route: "/admin/media",
      summary: `Media upload ${state.replace("_", " ")} for "${fileName}"`,
      metadata: {
        state,
        targetType: uploadTarget?.targetType ?? null,
        assetType: uploadTarget?.assetType ?? null,
        intendedUse: uploadTarget?.intendedUse ?? null,
        ...((metadata && typeof metadata === "object") ? metadata as Record<string, unknown> : { detail: metadata }),
      },
    });
  }
}

export const mediaAssetUploadService = new MediaAssetUploadService();

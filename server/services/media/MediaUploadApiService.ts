import type { MediaAsset, MediaUploadApiResult, MediaUploadTargetInput, UploadedMediaFile } from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { calculateSha256 } from "../../utils/media/mediaChecksumUtils";
import { signatureMatchesMime } from "../../utils/media/fileSignatureUtils";
import { getFileExtension, hasPathTraversal, sanitizeFileName } from "../../utils/media/mediaPathUtils";
import { buildNamespacedStoragePath } from "../../utils/media/storagePrefixUtils";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { mediaUploadJobPersistenceService } from "./MediaUploadJobPersistenceService";
import { mediaProcessingEnqueueService } from "./MediaProcessingEnqueueService";

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const audioExtensions = new Set(["mp3", "wav", "m4a", "mp4", "aac", "ogg"]);
const blockedExtensions = new Set(["exe", "js", "html", "php", "zip", "svg"]);

const mediaCategoryFromAssetType = (assetType: string) => {
  if (["audio_preview", "full_song", "stem", "instrumental", "vocal", "custom_audio"].includes(assetType)) return "audio";
  if (["video", "lyric_video", "short_clip", "animation"].includes(assetType)) return "video";
  return "image";
};

const maxBytesForTarget = (target: MediaUploadTargetInput): number => {
  if (target.assetType === "audio_preview") return mediaBackendConfig.maxAudioPreviewBytes;
  if (mediaCategoryFromAssetType(target.assetType) === "audio") return mediaBackendConfig.maxFullSongBytes;
  return mediaBackendConfig.maxImageBytes;
};

const sanitizedMetadata = (metadata: unknown): Record<string, unknown> | undefined => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) =>
    value === null || ["string", "number", "boolean"].includes(typeof value),
  ));
};

export class MediaUploadApiService {
  async uploadSingle(file: UploadedMediaFile | null, target: MediaUploadTargetInput, actorId: string): Promise<MediaUploadApiResult> {
    if (!file) throw new MediaApiError("MEDIA_FILE_MISSING", "A media file is required.", 400, "parse");
    this.validateTarget(target);
    const uploadJob = await mediaUploadJobPersistenceService.create(file, target, actorId);
    await mediaAuditPersistenceService.record("backend_media_upload_started", `Started backend upload for "${file.fileName}"`, {
      actorId,
      entityType: "media_upload_job",
      entityId: uploadJob.uploadJobId,
    });

    try {
      await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, "validating", "validation", 10);
      const validation = this.validateFile(file, target);
      if (validation.errors.length) {
        const failed = await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, "validation_failed", "validation", 100, {
          validationResult: validation,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        await mediaAuditPersistenceService.record("backend_media_upload_validation_failed", `Validation failed for "${file.fileName}"`, {
          actorId,
          entityType: "media_upload_job",
          entityId: uploadJob.uploadJobId,
          metadata: { errors: validation.errors.join("; ") },
        });
        return { success: false, uploadJob: failed ?? uploadJob, warnings: validation.warnings, errors: validation.errors };
      }

      await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, "uploading", "storage", 40, { warnings: validation.warnings });
      const checksum = calculateSha256(file.buffer);
      const duplicates = (await mediaStoragePersistenceService.list()).filter((item) => item.checksum === checksum);
      const warnings = [...validation.warnings, ...(duplicates.length ? ["A media file with the same checksum already exists."] : [])];
      const initialAccessLevel = target.assetType === "full_song" ? "admin_only" : target.accessLevel ?? "admin_only";
      const storagePath = buildNamespacedStoragePath({
        accessLevel: initialAccessLevel,
        target,
        fileName: file.fileName,
        publicPrefix: mediaBackendConfig.publicPrefix,
        privatePrefix: mediaBackendConfig.privatePrefix,
      });
      const provider = backendStorageProviderRegistry.getActiveProvider();
      const storageObject = await provider.upload({ file: { ...file, fileName: sanitizeFileName(file.fileName) }, target: { ...target, accessLevel: initialAccessLevel }, storagePath, checksum, uploadedBy: actorId });
      await mediaStoragePersistenceService.create(storageObject);

      await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, "processing", "database", 72, { storageObjectId: storageObject.storageObjectId, warnings });
      const mediaAsset = await this.createMediaAsset(file, target, storageObject, actorId);
      await mediaAssetPersistenceService.create(mediaAsset);
      await this.createInitialVersion(mediaAsset, storageObject);
      await mediaStoragePersistenceService.update(storageObject.storageObjectId, { assetId: mediaAsset.assetId });
      const finalStorageObject = { ...storageObject, assetId: mediaAsset.assetId };
      const processing = await mediaProcessingEnqueueService.enqueuePostUploadJobs({
        mediaAsset,
        storageObject: finalStorageObject,
        uploadJobId: uploadJob.uploadJobId,
        actorId,
      });
      const completed = await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, "completed", "complete", 100, {
        mediaAssetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        warnings: [...warnings, ...processing.warnings],
        processingJobIds: processing.queuedJobs.map((job) => job.processingJobId),
      });
      await mediaAuditPersistenceService.record("backend_media_upload_completed", `Completed backend upload for "${file.fileName}"`, {
        actorId,
        entityType: "media_asset",
        entityId: mediaAsset.assetId,
        metadata: { uploadJobId: uploadJob.uploadJobId, storageObjectId: storageObject.storageObjectId, duplicateCount: duplicates.length },
      });

      return {
        success: true,
        uploadJob: completed ?? uploadJob,
        mediaAsset,
        storageObject: finalStorageObject,
        publicUrl: finalStorageObject.publicUrl,
        warnings: [...warnings, ...processing.warnings],
        metadata: { processing },
      };
    } catch (error) {
      console.error("[media-upload] backend upload failed", {
        uploadJobId: uploadJob.uploadJobId,
        fileName: file.fileName,
        assetType: target.assetType,
        targetType: target.targetType,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, "failed", "error", 100, {
        errors: [error instanceof Error ? error.message : "Upload failed."],
      });
      await mediaAuditPersistenceService.record("backend_media_upload_failed", `Backend upload failed for "${file.fileName}"`, {
        actorId,
        entityType: "media_upload_job",
        entityId: uploadJob.uploadJobId,
      });
      throw error;
    }
  }

  validateTarget(target: MediaUploadTargetInput): void {
    const missing = ["targetType", "assetType", "intendedUse"].filter((key) => !String((target as Record<string, unknown>)[key] ?? "").trim());
    if (missing.length) throw new MediaApiError("MEDIA_TARGET_INVALID", `Missing upload target fields: ${missing.join(", ")}.`, 400, "validation");
    for (const value of [target.targetId, target.ownerId, target.ownerType].filter(Boolean) as string[]) {
      if (hasPathTraversal(value)) throw new MediaApiError("MEDIA_TARGET_INVALID", "Upload target contains unsafe path characters.", 400, "validation");
    }
  }

  validateFile(file: UploadedMediaFile, target: MediaUploadTargetInput): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const extension = getFileExtension(file.fileName);
    if (!extension) errors.push("File extension is required.");
    if (blockedExtensions.has(extension)) errors.push(`.${extension} files are blocked.`);
    if (file.fileName !== sanitizeFileName(file.fileName)) warnings.push(`Filename will be sanitized to ${sanitizeFileName(file.fileName)}.`);
    if (hasPathTraversal(file.fileName)) errors.push("File name contains unsafe path traversal.");
    if (file.size <= 0) errors.push("Uploaded file is empty.");
    if (file.size > maxBytesForTarget(target)) errors.push("File exceeds the configured maximum size.");
    const category = mediaCategoryFromAssetType(target.assetType);
    if (category === "image" && (!file.mimeType.startsWith("image/") || !imageExtensions.has(extension))) errors.push("File is not compatible with image upload target.");
    if (category === "audio" && (!file.mimeType.startsWith("audio/") || !audioExtensions.has(extension))) errors.push("File is not compatible with audio upload target.");
    if (target.assetType === "full_song" && target.accessLevel === "public") errors.push("Full song uploads cannot be public by default.");
    if (!signatureMatchesMime(file)) errors.push("File signature does not match declared MIME type.");
    return { valid: errors.length === 0, errors, warnings };
  }

  private async createMediaAsset(file: UploadedMediaFile, target: MediaUploadTargetInput, storageObject: Awaited<ReturnType<ReturnType<typeof backendStorageProviderRegistry.getActiveProvider>["upload"]>>, actorId: string): Promise<MediaAsset> {
    const now = new Date().toISOString();
    const url = storageObject.publicUrl ?? storageObject.signedUrl ?? storageObject.storagePath;
    return {
      assetId: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerType: target.ownerType ?? (target.targetType === "media_library" ? "media_library" : target.targetType),
      ownerId: target.ownerId ?? target.targetId ?? "unassigned",
      assetType: target.assetType,
      title: target.title?.trim() || sanitizeFileName(file.fileName).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
      description: target.description,
      url,
      thumbnailUrl: storageObject.mediaCategory === "image" ? url : undefined,
      largeUrl: storageObject.mediaCategory === "image" ? url : undefined,
      altText: target.altText,
      credit: target.credit,
      status: "draft",
      sortOrder: target.sortOrder,
      assignmentStatus: "unassigned",
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
      metadata: {
        ...sanitizedMetadata(target.metadata),
        originalFileName: file.fileName,
        sanitizedFileName: sanitizeFileName(file.fileName),
        storageObjectId: storageObject.storageObjectId,
        checksum: storageObject.checksum,
        backendPersistent: true,
      },
    };
  }

  private async createInitialVersion(mediaAsset: MediaAsset, storageObject: Awaited<ReturnType<ReturnType<typeof backendStorageProviderRegistry.getActiveProvider>["upload"]>>): Promise<void> {
    const { jsonDatabase } = await import("./JsonDatabase");
    const versionId = `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await jsonDatabase.update((data) => {
      data.mediaAssetVersions.push({
        versionId,
        assetId: mediaAsset.assetId,
        versionNumber: 1,
        storageObjectId: storageObject.storageObjectId,
        url: storageObject.publicUrl ?? storageObject.storagePath,
        fileName: storageObject.fileName,
        mimeType: storageObject.mimeType,
        fileSizeBytes: storageObject.fileSizeBytes,
        assetType: storageObject.assetType,
        status: "active",
        createdAt: new Date().toISOString(),
        createdBy: mediaAsset.createdBy,
        metadata: { backendUploadInitialVersion: true },
      });
      data.mediaAssets = data.mediaAssets.map((asset) => asset.assetId === mediaAsset.assetId ? { ...asset, activeVersionId: versionId } : asset);
    });
  }
}

export const mediaUploadApiService = new MediaUploadApiService();

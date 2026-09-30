import type {
  CreateDirectUploadSessionRequest,
  DirectMediaUploadSession,
  DirectUploadPart,
  MediaAsset,
  MediaStorageObject,
  MediaUploadTargetInput,
  UploadedMediaFile,
} from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { getFileExtension, hasPathTraversal, sanitizeFileName } from "../../utils/media/mediaPathUtils";
import { buildNamespacedStoragePath } from "../../utils/media/storagePrefixUtils";
import { verifyUploadedObject } from "../../utils/media/uploadVerificationUtils";
import {
  normalizeDirectUploadSessionRequest,
  resolveDirectUploadAccessLevel,
  selectDirectUploadStrategy,
  summarizeDirectUploadFile,
} from "../../utils/media/directUploadUtils";
import { calculateMultipartPartSize, createUploadParts, sortCompletedParts, validateCompletedParts } from "../../utils/media/multipartUploadUtils";
import { mediaUploadApiService } from "./MediaUploadApiService";
import { mediaUploadJobPersistenceService } from "./MediaUploadJobPersistenceService";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { jsonDatabase } from "./JsonDatabase";
import { directMediaUploadSessionPersistenceService } from "./DirectMediaUploadSessionPersistenceService";
import { mediaProcessingEnqueueService } from "./MediaProcessingEnqueueService";

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const audioExtensions = new Set(["mp3", "wav", "m4a", "mp4", "aac", "ogg"]);
const videoExtensions = new Set(["mp4", "mov", "webm"]);
const blockedExtensions = new Set(["exe", "js", "html", "php", "zip", "svg"]);

const safeMetadata = (metadata: unknown): Record<string, unknown> | undefined => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) =>
    value === null || ["string", "number", "boolean"].includes(typeof value),
  ));
};

const maxBytesForTarget = (request: CreateDirectUploadSessionRequest): number => {
  if (request.assetType === "audio_preview") return mediaBackendConfig.maxAudioPreviewBytes;
  if (["full_song", "custom_audio", "stem", "instrumental", "vocal"].includes(request.assetType) || request.mimeType.startsWith("audio/")) {
    return mediaBackendConfig.maxFullSongBytes;
  }
  return Math.max(mediaBackendConfig.maxImageBytes, mediaBackendConfig.maxFullSongBytes);
};

export class DirectMediaUploadSessionService {
  normalizeRequest(body: Record<string, unknown>): CreateDirectUploadSessionRequest {
    return normalizeDirectUploadSessionRequest(body);
  }

  async createUploadSession(body: Record<string, unknown>, actorId: string) {
    const request = this.normalizeRequest(body);
    const target = this.toUploadTarget(request);
    mediaUploadApiService.validateTarget(target);
    const validation = this.validateRequest(request);
    if (validation.errors.length) {
      throw new MediaApiError("DIRECT_UPLOAD_VALIDATION_FAILED", validation.errors.join(" "), 400, "validation");
    }

    const provider = backendStorageProviderRegistry.getActiveProvider();
    const accessLevel = resolveDirectUploadAccessLevel(request);
    const fileSummary = summarizeDirectUploadFile(request);
    const partSizeBytes = calculateMultipartPartSize(request.fileSizeBytes);
    const totalParts = Math.max(1, Math.ceil(request.fileSizeBytes / partSizeBytes));
    const providerSupportsDirectUpload = Boolean(provider.supportsDirectUpload?.());
    const providerSupportsMultipart = Boolean(provider.createMultipartUpload && provider.createPresignedPartUploadUrl && provider.completeMultipartUpload);
    const uploadStrategy = selectDirectUploadStrategy({
      fileSizeBytes: request.fileSizeBytes,
      assetType: request.assetType,
      providerSupportsDirectUpload,
      providerSupportsMultipart,
      totalParts,
    });
    const storagePath = buildNamespacedStoragePath({
      accessLevel,
      target,
      fileName: request.fileName,
      publicPrefix: mediaBackendConfig.publicPrefix,
      privatePrefix: mediaBackendConfig.privatePrefix,
    });
    const uploadJob = await mediaUploadJobPersistenceService.create(this.toUploadedFileStub(request), target, actorId);
    const expiresAt = new Date(Date.now() + mediaBackendConfig.directUploadExpirationSeconds * 1000).toISOString();
    const uploadedParts: DirectUploadPart[] = uploadStrategy === "multipart_presigned"
      ? createUploadParts(request.fileSizeBytes, partSizeBytes)
      : [];
    let multipartUploadId: string | undefined;
    let warnings = validation.warnings;

    if (uploadStrategy === "multipart_presigned") {
      const multipart = await provider.createMultipartUpload?.(storagePath, {
        mimeType: request.mimeType,
        fileSizeBytes: request.fileSizeBytes,
        assetType: request.assetType,
        accessLevel,
        checksum: request.checksum,
        metadata: safeMetadata(request.metadata),
      });
      multipartUploadId = multipart?.multipartUploadId;
      if (!multipartUploadId) throw new MediaApiError("DIRECT_UPLOAD_NOT_SUPPORTED", "Multipart upload could not be initialized.", 400, "storage", true);
    } else {
      warnings = [...warnings, "Backend selected proxy upload for this file/provider."];
    }

    const now = new Date().toISOString();
    const session: DirectMediaUploadSession = {
      uploadSessionId: `direct-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uploadJobId: uploadJob.uploadJobId,
      provider: provider.getProviderName(),
      bucket: mediaBackendConfig.bucket,
      storagePath,
      assetType: request.assetType,
      mediaCategory: fileSummary.mediaCategory,
      targetType: request.targetType,
      targetId: request.targetId,
      ownerType: request.ownerType,
      ownerId: request.ownerId,
      intendedUse: request.intendedUse,
      accessLevel,
      originalFileName: request.fileName,
      sanitizedFileName: fileSummary.sanitizedFileName,
      mimeType: request.mimeType,
      fileExtension: fileSummary.fileExtension,
      fileSizeBytes: request.fileSizeBytes,
      checksum: request.checksum,
      multipartUploadId,
      partSizeBytes,
      totalParts,
      uploadedParts,
      status: uploadStrategy === "backend_proxy" ? "created" : "authorized",
      uploadStrategy,
      expiresAt,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
      warnings,
      metadata: safeMetadata(request.metadata),
    };
    await directMediaUploadSessionPersistenceService.create(session);
    await mediaUploadJobPersistenceService.mark(uploadJob.uploadJobId, uploadStrategy === "backend_proxy" ? "queued" : "uploading", uploadStrategy === "backend_proxy" ? "validation" : "storage", uploadStrategy === "backend_proxy" ? 0 : 5, {
      warnings,
      metadata: { ...(uploadJob.metadata ?? {}), directUploadSessionId: session.uploadSessionId, uploadStrategy },
    });
    await mediaAuditPersistenceService.record("direct_upload_session_created", `Created direct upload session for "${request.fileName}"`, {
      actorId,
      entityType: "direct_media_upload_session",
      entityId: session.uploadSessionId,
      metadata: { uploadJobId: uploadJob.uploadJobId, uploadStrategy, provider: session.provider, accessLevel },
    });

    return this.toSessionResponse(session, uploadStrategy === "multipart_presigned" ? await this.createPartAuthorizations(session, [1, 2, 3]) : []);
  }

  async getSession(uploadSessionId: string): Promise<DirectMediaUploadSession> {
    const session = await directMediaUploadSessionPersistenceService.get(uploadSessionId);
    if (!session) throw new MediaApiError("DIRECT_UPLOAD_SESSION_NOT_FOUND", "Direct upload session was not found.", 404, "database");
    return this.markExpiredIfNeeded(session);
  }

  async listSessions(): Promise<DirectMediaUploadSession[]> {
    return directMediaUploadSessionPersistenceService.list();
  }

  async createPartUrl(uploadSessionId: string, partNumber: number) {
    const session = await this.getSession(uploadSessionId);
    this.assertUploadable(session);
    const authorization = await this.createPartAuthorizations(session, [partNumber]);
    return { success: true, uploadSessionId, parts: authorization };
  }

  async recordPart(uploadSessionId: string, part: { partNumber: number; etag?: string; checksum?: string; sizeBytes?: number }) {
    const session = await this.getSession(uploadSessionId);
    this.assertUploadable(session);
    const existing = session.uploadedParts.find((item) => item.partNumber === part.partNumber);
    if (!existing) throw new MediaApiError("DIRECT_UPLOAD_PART_FAILED", "Part number is not valid for this session.", 400, "storage", true);
    const updated = await directMediaUploadSessionPersistenceService.updatePart(uploadSessionId, {
      ...existing,
      etag: part.etag,
      checksum: part.checksum,
      sizeBytes: part.sizeBytes ?? existing.sizeBytes,
      status: "completed",
      attempts: existing.attempts + 1,
      uploadedAt: new Date().toISOString(),
    });
    await mediaUploadJobPersistenceService.update(session.uploadJobId, {
      progress: Math.min(95, Math.round(((updated?.uploadedParts.filter((item) => item.status === "completed").length ?? 0) / Math.max(1, session.totalParts ?? 1)) * 90) + 5),
    });
    return { success: true, session: updated };
  }

  async retryPart(uploadSessionId: string, partNumber: number) {
    const session = await this.getSession(uploadSessionId);
    this.assertUploadable(session);
    const existing = session.uploadedParts.find((part) => part.partNumber === partNumber);
    if (!existing) throw new MediaApiError("DIRECT_UPLOAD_PART_FAILED", "Part number is not valid for this session.", 400, "storage", true);
    if (existing.attempts >= mediaBackendConfig.directUploadMaxRetriesPerPart) {
      throw new MediaApiError("DIRECT_UPLOAD_PART_RETRY_EXHAUSTED", "Part retry limit has been reached.", 400, "storage");
    }
    await directMediaUploadSessionPersistenceService.updatePart(uploadSessionId, { ...existing, status: "pending", errors: [] });
    await mediaAuditPersistenceService.record("direct_upload_part_retried", `Retried part ${partNumber} for "${session.originalFileName}"`, {
      actorId: session.createdBy,
      entityType: "direct_media_upload_session",
      entityId: uploadSessionId,
      metadata: { partNumber },
    });
    return this.createPartUrl(uploadSessionId, partNumber);
  }

  async refreshSession(uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    if (session.status === "canceled" || session.status === "completed") {
      throw new MediaApiError("DIRECT_UPLOAD_SESSION_CANCELED", "Completed or canceled sessions cannot be refreshed.", 400, "storage");
    }
    const expiresAt = new Date(Date.now() + mediaBackendConfig.directUploadExpirationSeconds * 1000).toISOString();
    const updated = await directMediaUploadSessionPersistenceService.update(uploadSessionId, { status: "authorized", expiresAt });
    return this.toSessionResponse(updated ?? session, await this.createPartAuthorizations(updated ?? session, [1, 2, 3]));
  }

  async completeUpload(uploadSessionId: string, body: Record<string, unknown>) {
    const session = await this.getSession(uploadSessionId);
    this.assertUploadable(session);
    const completedParts = Array.isArray(body.completedParts)
      ? body.completedParts.map((part) => ({ partNumber: Number(part.partNumber), etag: String(part.etag ?? "") }))
      : session.uploadedParts.filter((part) => part.status === "completed").map((part) => ({ partNumber: part.partNumber, etag: part.etag ?? "" }));
    const validation = validateCompletedParts(completedParts, session.totalParts ?? 0);
    if (!validation.valid) throw new MediaApiError("DIRECT_UPLOAD_COMPLETION_FAILED", validation.errors.join(" "), 400, "storage", true);
    await directMediaUploadSessionPersistenceService.mark(uploadSessionId, "completing");
    await mediaUploadJobPersistenceService.mark(session.uploadJobId, "processing", "storage", 96);
    const provider = backendStorageProviderRegistry.getActiveProvider();
    if (!session.multipartUploadId || !provider.completeMultipartUpload) {
      throw new MediaApiError("DIRECT_UPLOAD_NOT_SUPPORTED", "Multipart completion is not supported for this provider.", 400, "storage");
    }
    const completion = await provider.completeMultipartUpload(session.storagePath, session.multipartUploadId, sortCompletedParts(completedParts));
    const existence = await provider.fileExists(session.storagePath);
    if (!existence.exists) throw new MediaApiError("DIRECT_UPLOAD_VERIFICATION_FAILED", "Uploaded object was not found after completion.", 500, "storage", true);
    const verification = verifyUploadedObject({
      expectedSizeBytes: session.fileSizeBytes,
      providerMetadata: existence.metadata,
      checksumExpected: session.checksum,
      checksumActual: typeof existence.metadata?.checksum === "string" ? existence.metadata.checksum : undefined,
    });
    if (!verification.valid) {
      await directMediaUploadSessionPersistenceService.mark(uploadSessionId, "failed", { errors: verification.errors, warnings: verification.warnings });
      await mediaAuditPersistenceService.record("direct_upload_verification_failed", `Direct upload verification failed for "${session.originalFileName}"`, {
        actorId: session.createdBy,
        entityType: "direct_media_upload_session",
        entityId: uploadSessionId,
        metadata: { errors: verification.errors.join("; ") },
      });
      throw new MediaApiError("DIRECT_UPLOAD_VERIFICATION_FAILED", verification.errors.join(" "), 500, "storage", true);
    }
    const storageObject = await this.createStorageObject(session, completion.etag);
    const mediaAsset = await this.createMediaAsset(session, storageObject);
    await mediaStoragePersistenceService.update(storageObject.storageObjectId, { assetId: mediaAsset.assetId });
    const finalStorageObject = { ...storageObject, assetId: mediaAsset.assetId };
    await this.createInitialVersion(mediaAsset, finalStorageObject);
    const processing = await mediaProcessingEnqueueService.enqueuePostUploadJobs({
      mediaAsset,
      storageObject: finalStorageObject,
      uploadJobId: session.uploadJobId,
      actorId: session.createdBy,
    });
    const completed = await mediaUploadJobPersistenceService.mark(session.uploadJobId, "completed", "complete", 100, {
      mediaAssetId: mediaAsset.assetId,
      storageObjectId: storageObject.storageObjectId,
      warnings: [...verification.warnings, ...processing.warnings],
      processingJobIds: processing.queuedJobs.map((job) => job.processingJobId),
    });
    const updatedSession = await directMediaUploadSessionPersistenceService.mark(uploadSessionId, "completed", {
      warnings: [...(session.warnings ?? []), ...verification.warnings, ...processing.warnings],
      metadata: { ...(session.metadata ?? {}), storageObjectId: storageObject.storageObjectId, assetId: mediaAsset.assetId, providerEtag: completion.etag, processing },
    });
    await mediaAuditPersistenceService.record("direct_upload_completed", `Completed direct upload for "${session.originalFileName}"`, {
      actorId: session.createdBy,
      entityType: "media_asset",
      entityId: mediaAsset.assetId,
      metadata: { uploadSessionId, uploadJobId: session.uploadJobId, storageObjectId: storageObject.storageObjectId },
    });
    return {
      success: true,
      uploadSession: updatedSession,
      uploadJob: completed,
      mediaAsset,
      storageObject: finalStorageObject,
      publicUrl: finalStorageObject.publicUrl,
      warnings: [...verification.warnings, ...processing.warnings],
      metadata: { uploadSessionId, uploadStrategy: session.uploadStrategy, processing },
    };
  }

  async cancelUpload(uploadSessionId: string, actorId: string) {
    const session = await this.getSession(uploadSessionId);
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const warnings: string[] = [];
    if (session.multipartUploadId && provider.abortMultipartUpload && session.status !== "completed") {
      try {
        await provider.abortMultipartUpload(session.storagePath, session.multipartUploadId);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "Multipart abort failed.");
      }
    }
    const updated = await directMediaUploadSessionPersistenceService.mark(uploadSessionId, "canceled", { warnings });
    await mediaUploadJobPersistenceService.mark(session.uploadJobId, "canceled", "error", 100, { warnings });
    await mediaAuditPersistenceService.record("direct_upload_canceled", `Canceled direct upload for "${session.originalFileName}"`, {
      actorId,
      entityType: "direct_media_upload_session",
      entityId: uploadSessionId,
      metadata: { abortWarningCount: warnings.length },
    });
    return { success: true, session: updated, warnings };
  }

  private validateRequest(request: CreateDirectUploadSessionRequest): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const extension = getFileExtension(request.fileName);
    if (!request.fileName.trim()) errors.push("File name is required.");
    if (!extension) errors.push("File extension is required.");
    if (blockedExtensions.has(extension)) errors.push(`.${extension} files are blocked.`);
    if (hasPathTraversal(request.fileName)) errors.push("File name contains unsafe path traversal.");
    if (request.fileName !== sanitizeFileName(request.fileName)) warnings.push(`Filename will be sanitized to ${sanitizeFileName(request.fileName)}.`);
    if (!request.mimeType.trim()) errors.push("MIME type is required.");
    if (request.fileSizeBytes <= 0) errors.push("File is empty.");
    if (request.fileSizeBytes > maxBytesForTarget(request)) errors.push("File exceeds the configured maximum size.");
    if (request.mimeType.startsWith("image/") && !imageExtensions.has(extension)) errors.push("Image MIME type is not compatible with file extension.");
    if (request.mimeType.startsWith("audio/") && !audioExtensions.has(extension)) errors.push("Audio MIME type is not compatible with file extension.");
    if (request.mimeType.startsWith("video/") && !videoExtensions.has(extension)) errors.push("Video MIME type is not compatible with file extension.");
    if (request.assetType === "full_song" && request.accessLevel === "public") warnings.push("Full song upload access was forced to admin_only.");
    return { errors, warnings };
  }

  private toUploadTarget(request: CreateDirectUploadSessionRequest): MediaUploadTargetInput {
    return {
      targetType: request.targetType,
      targetId: request.targetId,
      ownerType: request.ownerType,
      ownerId: request.ownerId,
      assetType: request.assetType,
      intendedUse: request.intendedUse,
      accessLevel: resolveDirectUploadAccessLevel(request),
      metadata: safeMetadata(request.metadata),
    };
  }

  private toUploadedFileStub(request: CreateDirectUploadSessionRequest): UploadedMediaFile {
    return {
      fieldName: "file",
      fileName: request.fileName,
      mimeType: request.mimeType,
      size: request.fileSizeBytes,
      buffer: Buffer.alloc(0),
    };
  }

  private async createPartAuthorizations(session: DirectMediaUploadSession, partNumbers: number[]) {
    if (session.uploadStrategy !== "multipart_presigned" || !session.multipartUploadId) return [];
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const uniquePartNumbers = [...new Set(partNumbers)]
      .filter((partNumber) => Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= (session.totalParts ?? 0));
    const authorizations = [];
    for (const partNumber of uniquePartNumbers) {
      const part = session.uploadedParts.find((item) => item.partNumber === partNumber);
      const authorization = await provider.createPresignedPartUploadUrl?.(session.storagePath, session.multipartUploadId, partNumber, {
        expiresInSeconds: Math.min(900, mediaBackendConfig.directUploadExpirationSeconds),
        contentLength: part?.sizeBytes,
        mimeType: session.mimeType,
      });
      if (authorization) authorizations.push({ partNumber, ...authorization });
    }
    return authorizations;
  }

  private toSessionResponse(session: DirectMediaUploadSession, parts: Awaited<ReturnType<DirectMediaUploadSessionService["createPartAuthorizations"]>>) {
    return {
      success: true,
      uploadSessionId: session.uploadSessionId,
      uploadJobId: session.uploadJobId,
      provider: session.provider,
      storagePathKey: session.storagePath,
      uploadStrategy: session.uploadStrategy,
      partSizeBytes: session.partSizeBytes,
      totalParts: session.totalParts,
      expiresAt: session.expiresAt,
      parts,
      warnings: session.warnings,
      session: { ...session, storagePath: session.storagePath },
    };
  }

  private async markExpiredIfNeeded(session: DirectMediaUploadSession): Promise<DirectMediaUploadSession> {
    if (["completed", "failed", "canceled", "expired"].includes(session.status)) return session;
    if (new Date(session.expiresAt).getTime() > Date.now()) return session;
    const expired = await directMediaUploadSessionPersistenceService.mark(session.uploadSessionId, "expired", { errors: ["Direct upload session expired."] });
    await mediaUploadJobPersistenceService.mark(session.uploadJobId, "failed", "error", 100, { errors: ["Direct upload session expired."] });
    return expired ?? session;
  }

  private assertUploadable(session: DirectMediaUploadSession): void {
    if (session.status === "expired") throw new MediaApiError("DIRECT_UPLOAD_SESSION_EXPIRED", "Direct upload session expired.", 400, "storage", true);
    if (session.status === "canceled") throw new MediaApiError("DIRECT_UPLOAD_SESSION_CANCELED", "Direct upload session was canceled.", 400, "storage");
    if (session.status === "completed") throw new MediaApiError("DIRECT_UPLOAD_COMPLETION_FAILED", "Direct upload session is already completed.", 400, "storage");
  }

  private async createStorageObject(session: DirectMediaUploadSession, etag?: string): Promise<MediaStorageObject> {
    const now = new Date().toISOString();
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const storageObject: MediaStorageObject = {
      storageObjectId: `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: session.provider,
      bucket: session.bucket,
      storagePath: session.storagePath,
      publicUrl: session.accessLevel === "public" ? provider.getPublicUrl(session.storagePath) : undefined,
      fileName: session.sanitizedFileName,
      originalFileName: session.originalFileName,
      mimeType: session.mimeType,
      fileExtension: session.fileExtension,
      fileSizeBytes: session.fileSizeBytes,
      mediaCategory: session.mediaCategory,
      assetType: session.assetType,
      accessLevel: session.assetType === "full_song" ? "admin_only" : session.accessLevel,
      status: "ready",
      checksum: session.checksum,
      uploadedBy: session.createdBy,
      uploadedAt: now,
      updatedAt: now,
      metadata: { directUploadSessionId: session.uploadSessionId, multipartUploadId: session.multipartUploadId, etag },
    };
    await mediaStoragePersistenceService.create(storageObject);
    return storageObject;
  }

  private async createMediaAsset(session: DirectMediaUploadSession, storageObject: MediaStorageObject): Promise<MediaAsset> {
    const now = new Date().toISOString();
    const url = storageObject.publicUrl ?? storageObject.signedUrl ?? storageObject.storagePath;
    const mediaAsset: MediaAsset = {
      assetId: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerType: session.ownerType ?? (session.targetType === "media_library" ? "media_library" : session.targetType),
      ownerId: session.ownerId ?? session.targetId ?? "unassigned",
      assetType: session.assetType,
      title: session.sanitizedFileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
      url,
      thumbnailUrl: session.mediaCategory === "image" ? url : undefined,
      largeUrl: session.mediaCategory === "image" ? url : undefined,
      status: "draft",
      assignmentStatus: "unassigned",
      createdBy: session.createdBy,
      updatedBy: session.createdBy,
      createdAt: now,
      updatedAt: now,
      metadata: {
        ...(session.metadata ?? {}),
        originalFileName: session.originalFileName,
        sanitizedFileName: session.sanitizedFileName,
        storageObjectId: storageObject.storageObjectId,
        checksum: storageObject.checksum,
        directUploadSessionId: session.uploadSessionId,
        directUploadStrategy: session.uploadStrategy,
        fullSongPrivate: session.assetType === "full_song",
      },
    };
    await mediaAssetPersistenceService.create(mediaAsset);
    return mediaAsset;
  }

  private async createInitialVersion(mediaAsset: MediaAsset, storageObject: MediaStorageObject): Promise<void> {
    const versionId = `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await jsonDatabase.update((data) => {
      data.mediaAssetVersions.push({
        versionId,
        assetId: mediaAsset.assetId,
        versionNumber: 1,
        storageObjectId: storageObject.storageObjectId,
        url: mediaAsset.url ?? storageObject.storagePath,
        fileName: storageObject.fileName,
        mimeType: storageObject.mimeType,
        fileSizeBytes: storageObject.fileSizeBytes,
        assetType: storageObject.assetType,
        status: "active",
        createdAt: new Date().toISOString(),
        createdBy: mediaAsset.createdBy,
        metadata: { directUploadInitialVersion: true },
      });
      data.mediaAssets = data.mediaAssets.map((asset) => asset.assetId === mediaAsset.assetId ? { ...asset, activeVersionId: versionId } : asset);
    });
  }
}

export const directMediaUploadSessionService = new DirectMediaUploadSessionService();

import type { MediaAssetMetadataValue, MediaAssetRecord } from "../../models/admin";
import type {
  MediaAccessLevel,
  MediaStorageObject,
  MediaUploadResult,
  MediaUploadTarget,
  StorageProviderConfig,
  StorageUploadResponse,
} from "../../models/media";
import { defaultStorageProviderConfig, defaultUploadTypeConfig } from "../../config/mediaStorageConfig";
import { getFileExtension } from "../../utils/media/fileNameUtils";
import {
  getAssetTypeFromUploadTarget,
  getMediaCategoryFromMimeType,
  isMediaAssetTypeCompatibleWithMimeType,
} from "../../utils/media/mediaTypeUtils";
import {
  buildMediaStoragePath,
  generateAssetId,
  generateStorageObjectId,
  isPublicAccessAllowed,
} from "../../utils/media/storagePathUtils";
import { createStorageProviderRegistry, type StorageProviderRegistry } from "./StorageProviderRegistry";
import type { StorageProviderAdapter, StorageUploadOptions } from "./StorageProviderAdapter";
import { uploadSecurityService } from "../security";

export interface MediaStorageUploadOptions extends StorageUploadOptions {
  createMediaAsset?: boolean;
  title?: string;
  description?: string;
  altText?: string;
  credit?: string;
  uploadedBy?: string;
}

export interface MediaStorageAccessContext {
  publicRoute?: boolean;
  adminRoute?: boolean;
  signedAccess?: boolean;
}

const toProviderMetadata = (metadata: Record<string, MediaAssetMetadataValue>): Record<string, string | number | boolean | null> =>
  Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => {
      const value = entry[1];
      return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  );

export class MediaStorageService {
  private readonly storageObjects = new Map<string, MediaStorageObject>();

  constructor(
    private readonly config: StorageProviderConfig = defaultStorageProviderConfig,
    private readonly providerRegistry: StorageProviderRegistry = createStorageProviderRegistry(config),
  ) {}

  getStorageConfig(): StorageProviderConfig {
    return this.config;
  }

  getActiveProvider(): StorageProviderAdapter {
    return this.providerRegistry.getActiveProvider();
  }

  buildStoragePath(uploadTarget: MediaUploadTarget, file: File): string {
    const sanitizedFileName = uploadSecurityService.sanitizeFileName(file.name);
    return uploadSecurityService.validateStoragePath(buildMediaStoragePath(uploadTarget, { name: sanitizedFileName }));
  }

  async uploadToStorage(file: File | null | undefined, uploadTarget: MediaUploadTarget | null | undefined, options: MediaStorageUploadOptions = {}): Promise<MediaUploadResult> {
    const errors = this.validateUploadRequest(file, uploadTarget);
    if (errors.length > 0 || !file || !uploadTarget) return { success: false, errors };

    try {
      const securityResult = uploadSecurityService.runSecurityChecks(file, uploadTarget);
      if (securityResult.blocked) {
        return {
          success: false,
          errors: securityResult.checks.filter((item) => item.status === "failed" || item.severity === "blocking").map((item) => item.message),
          warnings: securityResult.warnings,
          metadata: {
            securityBlocked: true,
            sanitizedFileName: securityResult.sanitizedFileName,
            securityCheckCount: securityResult.checks.length,
          },
        };
      }
      const storagePath = this.buildStoragePath(uploadTarget, file);
      const provider = this.getActiveProvider();
      const sanitizedMetadata = toProviderMetadata(uploadSecurityService.sanitizeUploadMetadata({
        ...(uploadTarget.metadata ?? {}),
        ...(options.metadata ?? {}),
        sanitizedFileName: securityResult.sanitizedFileName,
      }));
      const uploadResponse = await provider.uploadFile(file, storagePath, {
        accessLevel: options.accessLevel ?? uploadTarget.accessLevel,
        bucket: this.config.bucket,
        contentType: file.type,
        metadata: sanitizedMetadata,
        onProgress: options.onProgress,
      });
      if (!uploadResponse.success) {
        return { success: false, errors: uploadResponse.errors ?? ["Storage provider upload failed."], warnings: uploadResponse.warnings };
      }
      const storageObject = this.createStorageObject(file, uploadTarget, uploadResponse, options);
      this.storageObjects.set(storageObject.storageObjectId, storageObject);
      const mediaAsset = options.createMediaAsset === false ? undefined : this.createMediaAssetRecord(file, uploadTarget, storageObject, options);

      return {
        success: true,
        assetId: mediaAsset?.assetId,
        storageObjectId: storageObject.storageObjectId,
        mediaAsset,
        storageObject,
        publicUrl: storageObject.publicUrl,
        warnings: storageObject.accessLevel !== "public" ? ["Uploaded asset is not public until linked and published."] : undefined,
        metadata: {
          provider: storageObject.provider,
          storagePath: storageObject.storagePath,
          sanitizedFileName: securityResult.sanitizedFileName,
          securitySafe: securityResult.safe,
        },
      };
    } catch (error) {
      const normalized = this.getActiveProvider().normalizeError(error);
      const safeError = uploadSecurityService.sanitizeUploadError(normalized.message);
      return {
        success: false,
        errors: [safeError.message],
        metadata: {
          provider: normalized.provider,
          errorCode: safeError.code || normalized.code,
          retryable: normalized.retryable,
        },
      };
    }
  }

  createStorageObject(
    file: File,
    uploadTarget: MediaUploadTarget,
    uploadResponse: StorageUploadResponse,
    options: MediaStorageUploadOptions = {},
  ): MediaStorageObject {
    const mimeType = file.type || "application/octet-stream";
    const assetType = getAssetTypeFromUploadTarget(uploadTarget);
    return {
      storageObjectId: generateStorageObjectId(),
      provider: uploadResponse.provider,
      bucket: uploadResponse.bucket ?? this.config.bucket,
      storagePath: uploadResponse.storagePath,
      publicUrl: uploadTarget.accessLevel === "public" ? uploadResponse.publicUrl : undefined,
      signedUrl: uploadTarget.accessLevel === "signed" ? uploadResponse.signedUrl : undefined,
      fileName: uploadSecurityService.sanitizeFileName(file.name),
      originalFileName: file.name,
      mimeType,
      fileExtension: getFileExtension(file.name),
      fileSizeBytes: file.size,
      mediaCategory: getMediaCategoryFromMimeType(mimeType),
      assetType,
      accessLevel: uploadTarget.accessLevel,
      status: "ready",
      checksum: uploadResponse.checksum ?? uploadResponse.etag,
      uploadedBy: options.uploadedBy,
      uploadedAt: new Date().toISOString(),
      metadata: toProviderMetadata(uploadSecurityService.sanitizeUploadMetadata(uploadResponse.metadata)),
    };
  }

  getPublicUrl(storageObject: MediaStorageObject): string | undefined {
    if (!isPublicAccessAllowed(storageObject)) return undefined;
    return storageObject.publicUrl ?? this.getActiveProvider().getPublicUrl(storageObject.storagePath);
  }

  async archiveStorageObject(storageObjectId: string): Promise<MediaUploadResult> {
    const storageObject = this.storageObjects.get(storageObjectId);
    if (!storageObject) return { success: false, errors: ["Storage object was not found."] };
    const archived = { ...storageObject, status: "archived" as const, updatedAt: new Date().toISOString() };
    this.storageObjects.set(storageObjectId, archived);
    return { success: true, storageObjectId, storageObject: archived };
  }

  async deleteStorageObject(storageObjectId: string): Promise<MediaUploadResult> {
    const storageObject = this.storageObjects.get(storageObjectId);
    if (!storageObject) return { success: false, errors: ["Storage object was not found."] };
    const deletedFromProvider = await this.getActiveProvider().deleteFile(storageObject.storagePath);
    if (!deletedFromProvider) return { success: false, errors: ["Storage provider could not delete the object."] };
    const deleted = { ...storageObject, status: "deleted" as const, updatedAt: new Date().toISOString() };
    this.storageObjects.set(storageObjectId, deleted);
    return { success: true, storageObjectId, storageObject: deleted };
  }

  validateAccessLevel(storageObject: MediaStorageObject, context: MediaStorageAccessContext): boolean {
    if (storageObject.status !== "ready") return false;
    if (storageObject.accessLevel === "public") return true;
    if (storageObject.accessLevel === "admin_only") return Boolean(context.adminRoute);
    if (storageObject.accessLevel === "signed") return Boolean(context.signedAccess || context.adminRoute);
    return Boolean(context.adminRoute);
  }

  async getProviderHealth() {
    return this.getActiveProvider().getHealthStatus();
  }

  private validateUploadRequest(file: File | null | undefined, uploadTarget: MediaUploadTarget | null | undefined): string[] {
    const errors: string[] = [];
    if (!this.config.enabled) errors.push("Storage provider is disabled.");
    if (!file) errors.push("A file is required.");
    if (!uploadTarget) errors.push("An upload target is required.");
    if (!file || !uploadTarget) return errors;
    const typeConfig = defaultUploadTypeConfig[uploadTarget.assetType];
    if (!typeConfig) errors.push("Upload asset type is not supported.");
    if (this.config.maxFileSizeBytes && file.size > this.config.maxFileSizeBytes) errors.push("File exceeds provider maximum size.");
    if (typeConfig?.maxFileSizeBytes && file.size > typeConfig.maxFileSizeBytes) errors.push("File exceeds asset type maximum size.");
    if (typeConfig?.allowedMimeTypes.length && !typeConfig.allowedMimeTypes.includes(file.type)) errors.push("File MIME type is not allowed for this asset type.");
    if (!isMediaAssetTypeCompatibleWithMimeType(uploadTarget.assetType, file.type)) errors.push("File MIME type does not match upload target asset type.");
    return errors;
  }

  private createMediaAssetRecord(
    file: File,
    uploadTarget: MediaUploadTarget,
    storageObject: MediaStorageObject,
    options: MediaStorageUploadOptions,
  ): MediaAssetRecord {
    const assetId = generateAssetId(uploadTarget);
    const sanitizedTargetMetadata = uploadSecurityService.sanitizeUploadMetadata(uploadTarget.metadata);
    storageObject.assetId = assetId;
    return {
      assetId,
      ownerType: uploadTarget.ownerType ?? "custom",
      ownerId: uploadTarget.ownerId ?? uploadTarget.targetId ?? "unassigned",
      assetType: uploadTarget.assetType,
      title: options.title ?? file.name,
      description: options.description,
      url: storageObject.publicUrl ?? storageObject.signedUrl ?? storageObject.storagePath,
      thumbnailUrl: storageObject.mediaCategory === "image" ? storageObject.publicUrl : undefined,
      largeUrl: storageObject.mediaCategory === "image" ? storageObject.publicUrl : undefined,
      altText: options.altText,
      credit: options.credit,
      status: uploadTarget.accessLevel === "public" ? "published" : "draft",
      createdAt: storageObject.uploadedAt,
      updatedAt: storageObject.updatedAt,
      metadata: {
        ...sanitizedTargetMetadata,
        sanitizedFileName: storageObject.fileName,
        storage: {
          storageObjectId: storageObject.storageObjectId,
          provider: storageObject.provider,
          bucket: storageObject.bucket ?? null,
          storagePath: storageObject.storagePath,
          accessLevel: storageObject.accessLevel,
          status: storageObject.status,
          checksum: storageObject.checksum ?? null,
        },
      },
    };
  }
}

export const mediaStorageService = new MediaStorageService();

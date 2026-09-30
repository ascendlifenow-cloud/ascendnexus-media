import fs from "node:fs/promises";
import path from "node:path";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaCategory, MediaStorageObject } from "../../models/mediaModels";
import { getFileExtension, resolveInsideRoot, sanitizeFileName } from "../../utils/media/mediaPathUtils";
import type { BackendStorageProviderAdapter, BackendStorageUploadInput } from "../StorageProviderAdapter";

const mediaCategoryFromMime = (mimeType: string): MediaCategory => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "custom";
};

export class LocalStorageAdapter implements BackendStorageProviderAdapter {
  getProviderName(): string {
    return "local";
  }

  isConfigured(): boolean {
    return Boolean(mediaBackendConfig.uploadRoot);
  }

  async upload(input: BackendStorageUploadInput): Promise<MediaStorageObject> {
    const absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, input.storagePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.file.buffer);
    const accessLevel = input.target.assetType === "full_song" ? "admin_only" : input.target.accessLevel ?? "admin_only";
    const publicUrl = accessLevel === "public"
      ? `${mediaBackendConfig.publicBaseUrl.replace(/\/+$/, "")}/${input.storagePath.replace(/^\/+/, "")}`
      : undefined;
    const now = new Date().toISOString();
    return {
      storageObjectId: `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: this.getProviderName(),
      bucket: mediaBackendConfig.bucket,
      storagePath: input.storagePath,
      publicUrl,
      fileName: sanitizeFileName(input.file.fileName),
      originalFileName: input.file.fileName,
      mimeType: input.file.mimeType,
      fileExtension: getFileExtension(input.file.fileName),
      fileSizeBytes: input.file.size,
      mediaCategory: mediaCategoryFromMime(input.file.mimeType),
      assetType: input.target.assetType,
      accessLevel,
      status: "ready",
      checksum: input.checksum,
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
      updatedAt: now,
      metadata: { localPathStored: true },
    };
  }

  async delete(storagePath: string): Promise<boolean> {
    try {
      await fs.unlink(resolveInsideRoot(mediaBackendConfig.uploadRoot, storagePath));
      return true;
    } catch {
      return false;
    }
  }

  async copyFile(sourcePath: string, destinationPath: string, options: { accessLevel?: string; assetType?: string } = {}): Promise<{ publicUrl?: string; metadata?: Record<string, unknown> }> {
    const source = resolveInsideRoot(mediaBackendConfig.uploadRoot, sourcePath);
    const destination = resolveInsideRoot(mediaBackendConfig.uploadRoot, destinationPath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    const accessLevel = options.accessLevel ?? (destinationPath.startsWith(`${mediaBackendConfig.publicPrefix}/`) ? "public" : "admin_only");
    return {
      publicUrl: accessLevel === "public" ? this.getPublicUrl(destinationPath) : undefined,
      metadata: { localCopy: true, copiedFromPath: sourcePath, assetType: options.assetType },
    };
  }

  async fileExists(storagePath: string) {
    try {
      const absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, storagePath);
      const stat = await fs.stat(absolutePath);
      return {
        exists: stat.isFile(),
        storagePath,
        provider: this.getProviderName(),
        metadata: { fileSizeBytes: stat.size, updatedAt: stat.mtime.toISOString() },
      };
    } catch {
      return { exists: false, storagePath, provider: this.getProviderName() };
    }
  }

  async getObjectMetadata(storagePath: string): Promise<Record<string, unknown> | undefined> {
    const result = await this.fileExists(storagePath);
    return result.exists ? result.metadata : undefined;
  }

  async getSignedUrl(storageObject: MediaStorageObject, expirationSeconds: number, purpose: string): Promise<string | undefined> {
    return `/api/admin/media/storage/signed-url?storageObjectId=${encodeURIComponent(storageObject.storageObjectId)}&purpose=${encodeURIComponent(purpose)}&expiration=${expirationSeconds}`;
  }

  async getHealthStatus() {
    await fs.mkdir(mediaBackendConfig.uploadRoot, { recursive: true });
    return {
      provider: this.getProviderName(),
      configured: this.isConfigured(),
      available: true,
      bucketConfigured: Boolean(mediaBackendConfig.bucket),
      publicUrlConfigured: Boolean(mediaBackendConfig.publicBaseUrl),
      signedUrlsSupported: true,
      deleteSupported: true,
      copySupported: true,
      multipartSupported: false,
      message: "Local backend media storage is available.",
      checkedAt: new Date().toISOString(),
    };
  }

  getPublicUrl(storagePath: string): string | undefined {
    if (!storagePath.startsWith(`${mediaBackendConfig.publicPrefix}/`)) return undefined;
    return `${mediaBackendConfig.publicBaseUrl.replace(/\/+$/, "")}/${storagePath.replace(/^\/+/, "")}`;
  }
}

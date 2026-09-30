import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaAccessLevel, MediaCategory, MediaStorageObject } from "../../models/mediaModels";
import { mediaStoragePersistenceService } from "../../services/media/MediaStoragePersistenceService";
import { resolveInsideRoot, sanitizeFileName } from "./mediaPathUtils";

export const resolveLocalStorageObjectPath = (storageObject: MediaStorageObject): string => {
  if (storageObject.provider !== "local") {
    throw new Error("PROCESSING_STORAGE_READ_FAILED: configured provider does not expose a local processing path.");
  }
  return resolveInsideRoot(mediaBackendConfig.uploadRoot, storageObject.storagePath);
};

const mediaCategoryFromMime = (mimeType: string): MediaCategory => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "custom";
};

export const buildProcessingOutputStoragePath = (
  source: MediaStorageObject,
  outputType: string,
  extension: string,
): string => {
  const sourceDir = path.posix.dirname(source.storagePath);
  const namespace = source.storagePath.startsWith(`${mediaBackendConfig.publicPrefix}/`)
    ? mediaBackendConfig.publicPrefix
    : mediaBackendConfig.privatePrefix;
  const relativeDir = sourceDir.startsWith(`${namespace}/`) ? sourceDir.slice(namespace.length + 1) : sourceDir;
  const activeVersion = String(source.metadata?.activeVersionId ?? source.metadata?.versionId ?? "v1").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return path.posix.join(namespace, relativeDir, "derivatives", activeVersion, `${outputType}.${extension.replace(/^\./, "")}`);
};

export const createStorageObjectFromLocalFile = async (input: {
  source: MediaStorageObject;
  localFilePath: string;
  storagePath: string;
  mimeType: string;
  outputType: string;
  accessLevel?: MediaAccessLevel;
  metadata?: Record<string, unknown>;
}): Promise<MediaStorageObject> => {
  const destination = resolveInsideRoot(mediaBackendConfig.uploadRoot, input.storagePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(input.localFilePath, destination);
  const stat = await fs.stat(destination);
  const buffer = await fs.readFile(destination);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const accessLevel = input.accessLevel ?? input.source.accessLevel;
  const publicUrl = accessLevel === "public"
    ? `${mediaBackendConfig.publicBaseUrl.replace(/\/+$/, "")}/${input.storagePath.replace(/^\/+/, "")}`
    : undefined;
  const now = new Date().toISOString();
  const storageObject: MediaStorageObject = {
    storageObjectId: `storage-output-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    assetId: input.source.assetId,
    provider: input.source.provider,
    bucket: input.source.bucket,
    storagePath: input.storagePath,
    publicUrl,
    fileName: sanitizeFileName(path.basename(input.storagePath)),
    originalFileName: sanitizeFileName(path.basename(input.storagePath)),
    mimeType: input.mimeType,
    fileExtension: path.extname(input.storagePath).slice(1),
    fileSizeBytes: stat.size,
    mediaCategory: mediaCategoryFromMime(input.mimeType),
    assetType: input.source.assetType,
    accessLevel,
    status: "ready",
    checksum,
    uploadedBy: input.source.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
    metadata: {
      ...(input.metadata ?? {}),
      sourceStorageObjectId: input.source.storageObjectId,
      sourceStoragePath: input.source.storagePath,
      processingOutputType: input.outputType,
      generatedBy: "media_processing_worker",
    },
  };
  return mediaStoragePersistenceService.create(storageObject);
};

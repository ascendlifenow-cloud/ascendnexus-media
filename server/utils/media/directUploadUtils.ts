import type { CreateDirectUploadSessionRequest, DirectUploadStrategy, MediaAccessLevel, MediaCategory } from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { getFileExtension, sanitizeFileName } from "./mediaPathUtils";

export const directUploadError = (
  code: string,
  message: string,
  stage: string,
  retryable = false,
  extra: Record<string, unknown> = {},
) => ({ code, message, stage, retryable, ...extra });

export const getMediaCategoryFromAssetType = (assetType: string, mimeType = ""): MediaCategory => {
  if (assetType === "full_song" || assetType.includes("audio") || mimeType.startsWith("audio/")) return "audio";
  if (assetType.includes("video") || mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/") || ["cover_art", "artist_profile", "gallery_image", "promo_graphic", "custom_image"].includes(assetType)) return "image";
  return "custom";
};

export const resolveDirectUploadAccessLevel = (request: Pick<CreateDirectUploadSessionRequest, "assetType" | "accessLevel" | "targetType">): MediaAccessLevel => {
  if (request.assetType === "full_song") return "admin_only";
  if (request.accessLevel === "private" || request.accessLevel === "signed") return request.accessLevel;
  return "admin_only";
};

export const shouldUseDirectUpload = (fileSizeBytes: number, assetType: string): boolean =>
  assetType === "full_song" || fileSizeBytes >= mediaBackendConfig.directUploadMinFileSizeBytes;

export const selectDirectUploadStrategy = (input: {
  fileSizeBytes: number;
  assetType: string;
  providerSupportsDirectUpload: boolean;
  providerSupportsMultipart: boolean;
  totalParts: number;
}): DirectUploadStrategy => {
  if (!shouldUseDirectUpload(input.fileSizeBytes, input.assetType) || !input.providerSupportsDirectUpload) return "backend_proxy";
  return input.providerSupportsMultipart && input.totalParts >= 1 ? "multipart_presigned" : "backend_proxy";
};

export const normalizeDirectUploadSessionRequest = (body: Record<string, unknown>): CreateDirectUploadSessionRequest => ({
  fileName: String(body.fileName ?? ""),
  fileSizeBytes: Number(body.fileSizeBytes ?? 0),
  mimeType: String(body.mimeType ?? ""),
  assetType: String(body.assetType ?? ""),
  targetType: String(body.targetType ?? ""),
  targetId: typeof body.targetId === "string" ? body.targetId : undefined,
  ownerType: typeof body.ownerType === "string" ? body.ownerType : undefined,
  ownerId: typeof body.ownerId === "string" ? body.ownerId : undefined,
  intendedUse: String(body.intendedUse ?? ""),
  accessLevel: typeof body.accessLevel === "string" ? body.accessLevel as MediaAccessLevel : undefined,
  checksum: typeof body.checksum === "string" ? body.checksum : undefined,
  metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : undefined,
});

export const summarizeDirectUploadFile = (request: CreateDirectUploadSessionRequest) => ({
  sanitizedFileName: sanitizeFileName(request.fileName),
  fileExtension: getFileExtension(request.fileName),
  mediaCategory: getMediaCategoryFromAssetType(request.assetType, request.mimeType),
});

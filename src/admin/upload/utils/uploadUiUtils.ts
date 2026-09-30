import type { MediaUploadTarget } from "../../../models/media";
import { defaultUploadTypeConfig } from "../../../config/mediaStorageConfig";
import { getMediaCategoryFromMimeType, isMediaAssetTypeCompatibleWithMimeType } from "../../../utils/media/mediaTypeUtils";

export const createUploadQueueItemId = (): string =>
  `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export const getAcceptHelperText = (accept?: string): string =>
  accept?.trim() ? `Accepted files: ${accept}` : "Accepted files depend on the selected upload target.";

export const getUploadMediaLabel = (mimeType: string): string => {
  const category = getMediaCategoryFromMimeType(mimeType);
  return category === "custom" ? "File" : category.charAt(0).toUpperCase() + category.slice(1);
};

export const validateSelectedFiles = (
  files: readonly File[],
  uploadTarget: MediaUploadTarget | null | undefined,
  options: { maxFiles?: number; multiple?: boolean; accept?: string } = {},
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!uploadTarget) errors.push("Upload target is required.");
  if (!files.length) errors.push("No file selected.");
  if (!options.multiple && files.length > 1) errors.push("Only one file can be selected.");
  if (options.maxFiles && files.length > options.maxFiles) errors.push(`Select ${options.maxFiles} file${options.maxFiles === 1 ? "" : "s"} or fewer.`);

  files.forEach((file) => {
    if (!uploadTarget) return;
    const typeConfig = defaultUploadTypeConfig[uploadTarget.assetType];
    if (typeConfig?.allowedMimeTypes.length && !typeConfig.allowedMimeTypes.includes(file.type)) {
      errors.push(`${file.name} is not an allowed file type for this upload target.`);
    }
    if (typeConfig?.maxFileSizeBytes && file.size > typeConfig.maxFileSizeBytes) {
      errors.push(`${file.name} exceeds the maximum size for this upload target.`);
    }
    if (!isMediaAssetTypeCompatibleWithMimeType(uploadTarget.assetType, file.type)) {
      errors.push(`${file.name} does not match the expected media category.`);
    }
    if (!file.type) warnings.push(`${file.name} has no MIME type; upload validation may be limited.`);
  });

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
};

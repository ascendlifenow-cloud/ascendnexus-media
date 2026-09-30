import type { MediaAssetType } from "../../models/admin";
import type { MediaCategory, MediaUploadTarget, MediaValidationMessage } from "../../models/media";
import { getFileExtension, sanitizeFileName } from "./fileNameUtils";
import { getMediaCategoryFromAssetType, getMediaCategoryFromMimeType } from "./mediaTypeUtils";

const unsafeExtensions = new Set(["exe", "bat", "cmd", "sh", "js", "html", "htm", "php", "py", "jar", "zip"]);

export const createValidationMessage = (
  severity: MediaValidationMessage["severity"],
  code: string,
  message: string,
  field?: string,
  metadata?: MediaValidationMessage["metadata"],
): MediaValidationMessage => ({
  messageId: `${code}-${Math.random().toString(36).slice(2, 8)}`,
  severity,
  code,
  message,
  field,
  metadata,
});

export const isUnsafeFileExtension = (extension: string): boolean => unsafeExtensions.has(extension.toLowerCase());

export const getFileNameSafetyMessages = (file: File): MediaValidationMessage[] => {
  const messages: MediaValidationMessage[] = [];
  const fileName = file.name ?? "";
  const extension = getFileExtension(fileName);

  if (!fileName.trim()) messages.push(createValidationMessage("error", "filename_empty", "File name is required.", "fileName"));
  if (fileName.includes("../") || fileName.includes("..\\") || fileName.includes("/") || fileName.includes("\\")) {
    messages.push(createValidationMessage("error", "filename_path_traversal", "File name cannot include path traversal or path separators.", "fileName"));
  }
  if (/[\u0000-\u001f\u007f]/.test(fileName)) messages.push(createValidationMessage("error", "filename_control_chars", "File name cannot include control characters.", "fileName"));
  if (fileName.length > 180) messages.push(createValidationMessage("error", "filename_too_long", "File name is too long.", "fileName"));
  if (extension && isUnsafeFileExtension(extension)) messages.push(createValidationMessage("error", "extension_unsafe", `.${extension} files are not allowed.`, "fileExtension"));
  if (/\s/.test(fileName)) messages.push(createValidationMessage("warning", "filename_spaces", "Spaces will be replaced during storage path generation.", "fileName"));
  if (extension && extension !== extension.toLowerCase()) messages.push(createValidationMessage("warning", "extension_uppercase", "File extension will be normalized to lowercase.", "fileExtension"));
  if (sanitizeFileName(fileName) !== fileName.toLowerCase()) messages.push(createValidationMessage("info", "filename_sanitized", "File name will be sanitized for storage.", "fileName"));

  return messages;
};

export const getExpectedCategoryForUploadTarget = (uploadTarget: MediaUploadTarget): MediaCategory =>
  getMediaCategoryFromAssetType(uploadTarget.assetType);

export const isMimeCompatibleWithUploadTarget = (mimeType: string, uploadTarget: MediaUploadTarget): boolean => {
  const expected = getExpectedCategoryForUploadTarget(uploadTarget);
  const actual = getMediaCategoryFromMimeType(mimeType);
  return expected === "custom" || actual === expected;
};

const extensionCategoryMap: Record<MediaCategory, string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
  audio: ["mp3", "wav", "m4a", "aac", "ogg"],
  video: ["mp4", "webm"],
  document: ["pdf", "txt"],
  custom: [],
};

export const getCategoryFromExtension = (extension: string): MediaCategory => {
  const ext = extension.toLowerCase();
  const match = (Object.entries(extensionCategoryMap) as Array<[MediaCategory, string[]]>).find(([, extensions]) => extensions.includes(ext));
  return match?.[0] ?? "custom";
};

export const isExtensionCompatibleWithAssetType = (extension: string, assetType: MediaAssetType): boolean => {
  const expected = getMediaCategoryFromAssetType(assetType);
  const actual = getCategoryFromExtension(extension);
  return expected === "custom" || actual === expected;
};

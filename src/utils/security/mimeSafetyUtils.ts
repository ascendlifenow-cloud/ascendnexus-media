import type { UploadSecurityPolicy } from "../../models/security";
import { getAllFileExtensions, getSafeFileExtension } from "./fileNameSanitizationUtils";

export const defaultBlockedExtensions = [
  "exe", "bat", "cmd", "sh", "ps1", "js", "mjs", "cjs", "ts", "tsx", "jsx", "html", "htm", "php", "py", "rb", "pl", "jar", "war", "zip", "rar", "7z", "tar", "gz", "sql", "db", "sqlite", "dll", "dmg", "pkg", "app",
];

export const defaultBlockedMimeTypes = [
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-sh",
  "application/x-php",
  "application/java-archive",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

export const defaultAllowedMimeTypes = [
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg",
  "video/mp4", "video/webm",
];

export const defaultAllowedExtensions = ["jpg", "jpeg", "png", "webp", "mp3", "wav", "m4a", "mp4", "aac", "ogg", "webm"];

export const mimeExtensionMap: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/svg+xml": ["svg"],
  "audio/mpeg": ["mp3"],
  "audio/mp3": ["mp3"],
  "audio/wav": ["wav"],
  "audio/x-wav": ["wav"],
  "audio/mp4": ["m4a", "mp4"],
  "audio/aac": ["aac"],
  "audio/ogg": ["ogg"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
};

export const getDefaultUploadSecurityPolicy = (): UploadSecurityPolicy => ({
  policyId: "default-upload-security-policy",
  allowedMimeTypes: defaultAllowedMimeTypes,
  allowedExtensions: defaultAllowedExtensions,
  blockedExtensions: defaultBlockedExtensions,
  blockedMimeTypes: defaultBlockedMimeTypes,
  allowSvg: false,
  allowGif: false,
  allowUnknownMime: false,
  requireMimeExtensionMatch: true,
  maxFileNameLength: 140,
  sanitizeFileName: true,
  blockPathTraversal: true,
  blockExecutableFiles: true,
  blockHtmlScriptFiles: true,
  requireUploadTarget: true,
});

export const isBlockedExtension = (extension: string, policy = getDefaultUploadSecurityPolicy()): boolean =>
  policy.blockedExtensions.includes(extension.toLowerCase());

export const isBlockedMimeType = (mimeType: string, policy = getDefaultUploadSecurityPolicy()): boolean =>
  policy.blockedMimeTypes.includes(mimeType.toLowerCase());

export const isAllowedMimeType = (mimeType: string, policy = getDefaultUploadSecurityPolicy()): boolean =>
  policy.allowedMimeTypes.includes(mimeType.toLowerCase());

export const isAllowedExtension = (extension: string, policy = getDefaultUploadSecurityPolicy()): boolean =>
  policy.allowedExtensions.includes(extension.toLowerCase());

export const hasUnsafeDoubleExtension = (fileName: string, policy = getDefaultUploadSecurityPolicy()): boolean =>
  getAllFileExtensions(fileName).some((extension) => isBlockedExtension(extension, policy));

export const mimeMatchesExtension = (fileName: string, mimeType: string): boolean => {
  const extension = getSafeFileExtension(fileName);
  const allowed = mimeExtensionMap[mimeType.toLowerCase()];
  return Boolean(extension && allowed?.includes(extension));
};


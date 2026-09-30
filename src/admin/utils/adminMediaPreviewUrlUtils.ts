import { adminApiUrl } from "../../services/admin/adminApiUrl";

const browserLoadableUrlPattern = /^(\/|https?:\/\/|data:image\/)/i;
const privateStorageKeyPattern = /^(private|processing|quarantine)\//i;

export const isBrowserLoadableAdminMediaUrl = (value: string | null | undefined): value is string => {
  const trimmed = value?.trim();
  return Boolean(trimmed && browserLoadableUrlPattern.test(trimmed) && !privateStorageKeyPattern.test(trimmed));
};

export const buildAdminStorageObjectContentUrl = (storageObjectId: string | null | undefined): string | undefined => {
  const trimmed = storageObjectId?.trim();
  return trimmed ? adminApiUrl(`/api/admin/media/storage/objects/${encodeURIComponent(trimmed)}/content`) : undefined;
};

export const resolveAdminImagePreviewUrl = (url: string | null | undefined, storageObjectId: string | null | undefined): string | undefined => {
  if (isBrowserLoadableAdminMediaUrl(url)) return url.trim();
  return buildAdminStorageObjectContentUrl(storageObjectId);
};

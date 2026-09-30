import type { MediaAssetRecord } from "../../models/admin";
import type { MediaAssetVisibilityState, PublicAssetPolicy } from "../../models/media";
import { getMediaCategoryFromAssetType } from "./mediaTypeUtils";
import { isSafePublicMediaUrl } from "./publicSafeUrlUtils";

export const createVisibilityState = (
  partial: Omit<MediaAssetVisibilityState, "checkedAt">,
): MediaAssetVisibilityState => ({
  ...partial,
  checkedAt: new Date().toISOString(),
});

const getStringMetadataValue = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

const hasPromotableStorageObject = (asset: MediaAssetRecord): boolean => {
  const metadata = asset.metadata;
  if (!metadata) return false;
  if (getStringMetadataValue(metadata.storageObjectId) || getStringMetadataValue(metadata.publicStorageObjectId)) return true;
  const storage = metadata.storage;
  if (storage && typeof storage === "object" && !Array.isArray(storage)) {
    return Boolean(getStringMetadataValue((storage as Record<string, unknown>).storageObjectId));
  }
  return false;
};

const canPromoteVisualAssetForPolicy = (asset: MediaAssetRecord, policy?: PublicAssetPolicy): boolean =>
  policy?.requiresAssetPublished === false &&
  getMediaCategoryFromAssetType(asset.assetType) === "image" &&
  hasPromotableStorageObject(asset);

export const getAssetVisibilityBlockingIssues = (
  asset: MediaAssetRecord | null | undefined,
  policy?: PublicAssetPolicy,
): string[] => {
  const issues: string[] = [];
  if (!asset) return ["Media asset is missing."];
  if (asset.metadata?.deletedAt) issues.push("Media asset is soft-deleted.");
  if (asset.status === "archived") issues.push("Media asset is archived.");
  if (asset.status === "draft" && policy?.requiresAssetPublished !== false) issues.push("Media asset is draft.");
  if (!isSafePublicMediaUrl(asset.url) && !canPromoteVisualAssetForPolicy(asset, policy)) issues.push("Media asset URL is not public-safe.");
  const category = getMediaCategoryFromAssetType(asset.assetType);
  if (policy?.allowedMediaCategories.length && !policy.allowedMediaCategories.includes(category)) {
    issues.push(`Media asset category ${category} is not allowed for this field.`);
  }
  if (policy?.allowedAssetTypes.length && !policy.allowedAssetTypes.includes(asset.assetType)) {
    issues.push(`Media asset type ${asset.assetType} is not allowed for this field.`);
  }
  return issues;
};

export const getAssetVisibilityWarnings = (
  asset: MediaAssetRecord | null | undefined,
  policy?: PublicAssetPolicy,
): string[] => {
  const warnings: string[] = [];
  if (!asset) return warnings;
  if (asset.status !== "published") {
    warnings.push(canPromoteVisualAssetForPolicy(asset, policy) ? "Asset will be promoted to public storage during assignment." : "Asset is not published.");
  }
  if (policy?.allowFallback) warnings.push("Fallback is allowed if this asset is unavailable.");
  return warnings;
};

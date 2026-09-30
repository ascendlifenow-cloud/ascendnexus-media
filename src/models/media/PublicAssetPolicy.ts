import type { MediaAssetType } from "../admin";
import type { MediaCategory } from "./MediaStorageObject";
import type { MediaAssetLinkEntityType, MediaAssetLinkFieldKey } from "./MediaAssetLink";

export interface PublicAssetPolicy {
  policyId: string;
  entityType: MediaAssetLinkEntityType;
  fieldKey: MediaAssetLinkFieldKey;
  requiredAssetTypes: MediaAssetType[];
  allowedAssetTypes: MediaAssetType[];
  allowedMediaCategories: MediaCategory[];
  requiresEntityPublic: boolean;
  requiresAssetPublished: boolean;
  requiresStoragePublic: boolean;
  allowAdminPreview: boolean;
  allowFallback: boolean;
  blockingIfMissing: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

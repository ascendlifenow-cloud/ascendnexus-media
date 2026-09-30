import type { MediaAssetLinkEntityType, MediaAssetLinkFieldKey } from "./MediaAssetLink";

export type MediaAssetVisibility =
  | "public"
  | "not_public"
  | "admin_only"
  | "draft"
  | "archived"
  | "blocked"
  | "unassigned"
  | "missing"
  | "unknown";

export interface MediaAssetVisibilityState {
  assetId: string;
  entityType?: MediaAssetLinkEntityType;
  entityId?: string;
  fieldKey?: MediaAssetLinkFieldKey;
  visibility: MediaAssetVisibility;
  publicAllowed: boolean;
  reason: string;
  blockingIssues: string[];
  warnings: string[];
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

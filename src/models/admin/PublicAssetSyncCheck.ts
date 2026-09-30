import type { PublishingEntityType } from "./PublishingWorkflow";

export type PublicAssetSyncStatus =
  | "synced"
  | "missing"
  | "mismatch"
  | "blocked"
  | "fallback_used"
  | "not_applicable"
  | "error";

export type PublicAssetSyncSeverity = "info" | "warning" | "error" | "blocking";

export interface PublicAssetSyncCheck {
  checkId: string;
  entityType: PublishingEntityType | "site_config" | "seo_metadata" | "social_metadata" | "public_path";
  entityId?: string;
  entitySlug?: string;
  publicPath: string;
  fieldKey: string;
  expectedAssetId?: string;
  expectedUrl?: string;
  actualUrl?: string;
  status: PublicAssetSyncStatus;
  severity: PublicAssetSyncSeverity;
  message: string;
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}


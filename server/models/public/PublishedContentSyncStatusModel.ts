export type PublishedContentSyncStatusValue = "pending" | "syncing" | "synced" | "synced_with_warnings" | "failed" | "stale";

export interface PublishedContentSyncStatus {
  entityType: string;
  entityId: string;
  publicationOperationId: string;
  status: PublishedContentSyncStatusValue;
  projectionVersion?: number;
  cacheInvalidated: boolean;
  assetSyncVerified: boolean;
  lastSyncedAt?: string;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

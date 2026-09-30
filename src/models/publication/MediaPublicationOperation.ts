import type { MediaPublicationStage, MediaPublicationStageType } from "./MediaPublicationStage";

export type MediaPublicationEntityType =
  | "artist"
  | "release"
  | "gallery_item"
  | "homepage"
  | "homepage_section"
  | "site_config"
  | "site_configuration"
  | "metadata"
  | "seo_metadata"
  | "social_metadata"
  | "media_asset"
  | "standalone_media"
  | "custom";
export type MediaPublicationActionType = "publish" | "activate" | "republish" | "unpublish" | "archive" | "restore" | "rollback" | "sync_only";
export type MediaPublicationStatus = "requested" | "validating" | "blocked" | "waiting_for_processing" | "promoting_storage" | "updating_records" | "activating_delivery" | "verifying_sync" | "completed" | "completed_with_warnings" | "failed" | "rolling_back" | "rolled_back" | "canceled";

export interface MediaPublicationOperation {
  publicationOperationId: string;
  entityType: MediaPublicationEntityType;
  entityId: string;
  actionType: MediaPublicationActionType;
  status: MediaPublicationStatus;
  currentStage: MediaPublicationStageType;
  requestedAssetIds: string[];
  requiredAssetIds: string[];
  optionalAssetIds: string[];
  promotedAssetIds: string[];
  failedAssetIds: string[];
  blockedAssetIds: string[];
  processingJobIds: string[];
  storageOperationJobIds: string[];
  cdnInvalidationRequestIds: string[];
  syncReportId?: string;
  blockingIssues: string[];
  warnings: string[];
  errors: string[];
  requestedBy?: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  rolledBackAt?: string;
  stages: MediaPublicationStage[];
  metadata?: Record<string, unknown>;
}

export interface MediaPublicationOptions {
  waitForRequiredProcessing?: boolean;
  promoteOptionalAssets?: boolean;
  updateEntityFields?: boolean;
  activateCdn?: boolean;
  runSyncVerification?: boolean;
  rollbackOnRequiredFailure?: boolean;
  preservePreviousPublicVersion?: boolean;
  allowFallbacks?: boolean;
  metadata?: Record<string, unknown>;
}

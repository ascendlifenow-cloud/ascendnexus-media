export type MediaAccessLevel = "public" | "private" | "admin_only" | "signed";
export type MediaAssetStatus = "draft" | "published" | "archived" | "deleted";
export type MediaAssignmentStatus = "unassigned" | "assigned" | "multi_assigned" | "detached";
export type MediaCategory = "audio" | "image" | "video" | "document" | "custom";
export type MediaStorageStatus = "pending" | "uploaded" | "processing" | "ready" | "failed" | "archived" | "deleted";
export type MediaUploadJobStatus = "queued" | "validating" | "validation_failed" | "uploading" | "processing" | "completed" | "failed" | "canceled";
export type MediaUploadStage = "auth" | "parse" | "validation" | "storage" | "database" | "processing" | "complete" | "error";
export type DirectUploadPartStatus = "pending" | "uploading" | "completed" | "failed" | "canceled";
export type DirectMediaUploadSessionStatus = "created" | "authorized" | "uploading" | "paused" | "verifying" | "completing" | "completed" | "failed" | "expired" | "canceled";
export type DirectUploadStrategy = "single_presigned" | "multipart_presigned" | "backend_proxy";
export type MediaProcessingJobType =
  | "image_metadata"
  | "image_derivatives"
  | "blur_placeholder"
  | "audio_metadata"
  | "audio_waveform"
  | "audio_transcode"
  | "checksum_verify"
  | "storage_promote_public"
  | "storage_demote_private"
  | "cdn_invalidate"
  | "publish"
  | "republish"
  | "unpublish"
  | "archive"
  | "restore"
  | "rollback"
  | "legacy_asset_import"
  | "orphan_cleanup"
  | "custom";
export type MediaProcessingJobStatusValue = "queued" | "delayed" | "active" | "processing" | "completed" | "failed" | "retrying" | "canceled" | "dead_letter" | "skipped";
export type MediaProcessingJobOutputType =
  | "image_thumbnail"
  | "image_card"
  | "image_feature"
  | "image_hero"
  | "image_banner"
  | "image_social"
  | "blur_placeholder"
  | "audio_streamable_preview"
  | "audio_waveform_json"
  | "audio_waveform_image"
  | "audio_transcoded_mp3"
  | "audio_transcoded_aac"
  | "metadata"
  | "checksum"
  | "public_storage_object"
  | "custom";
export type MediaProcessingJobOutputStatus = "planned" | "processing" | "ready" | "failed" | "skipped";

export interface MediaUploadTargetInput {
  targetType: string;
  targetId?: string;
  ownerType?: string;
  ownerId?: string;
  assetType: string;
  intendedUse: string;
  accessLevel?: MediaAccessLevel;
  title?: string;
  description?: string;
  altText?: string;
  credit?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface UploadedMediaFile {
  fieldName: string;
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface MediaAsset {
  assetId: string;
  ownerType: string;
  ownerId?: string;
  assetType: string;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  largeUrl?: string;
  altText?: string;
  credit?: string;
  status: MediaAssetStatus;
  sortOrder?: number;
  activeVersionId?: string;
  assignmentStatus: MediaAssignmentStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MediaStorageObject {
  storageObjectId: string;
  assetId?: string;
  provider: string;
  bucket?: string;
  storagePath: string;
  publicUrl?: string;
  signedUrl?: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  mediaCategory: MediaCategory;
  assetType: string;
  accessLevel: MediaAccessLevel;
  status: MediaStorageStatus;
  checksum?: string;
  uploadedBy?: string;
  uploadedAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaUploadJob {
  uploadJobId: string;
  fileName: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  assetType: string;
  targetType: string;
  targetId?: string;
  ownerType?: string;
  ownerId?: string;
  status: MediaUploadJobStatus;
  stage: MediaUploadStage;
  progress: number;
  validationResult?: Record<string, unknown>;
  storageObjectId?: string;
  mediaAssetId?: string;
  processingJobIds: string[];
  errors: string[];
  warnings: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface DirectUploadPart {
  partNumber: number;
  sizeBytes: number;
  etag?: string;
  checksum?: string;
  status: DirectUploadPartStatus;
  attempts: number;
  uploadedAt?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

export interface DirectMediaUploadSession {
  uploadSessionId: string;
  uploadJobId: string;
  provider: string;
  bucket?: string;
  storagePath: string;
  assetType: string;
  mediaCategory: MediaCategory;
  targetType: string;
  targetId?: string;
  ownerType?: string;
  ownerId?: string;
  intendedUse: string;
  accessLevel: MediaAccessLevel;
  originalFileName: string;
  sanitizedFileName: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  checksum?: string;
  multipartUploadId?: string;
  partSizeBytes?: number;
  totalParts?: number;
  uploadedParts: DirectUploadPart[];
  status: DirectMediaUploadSessionStatus;
  uploadStrategy: DirectUploadStrategy;
  expiresAt: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateDirectUploadSessionRequest {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  assetType: string;
  targetType: string;
  targetId?: string;
  ownerType?: string;
  ownerId?: string;
  intendedUse: string;
  accessLevel?: MediaAccessLevel;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaProcessingJobInput {
  assetId: string;
  storageObjectId: string;
  sourceStoragePath: string;
  sourceUrl?: string;
  assetType: string;
  mediaCategory: MediaCategory;
  requestedOutputs: string[];
  accessLevel: MediaAccessLevel;
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface MediaProcessingJobOutput {
  outputId: string;
  outputType: MediaProcessingJobOutputType;
  storageObjectId?: string;
  storagePath?: string;
  url?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  checksum?: string;
  status: MediaProcessingJobOutputStatus;
  metadata?: Record<string, unknown>;
}

export interface MediaProcessingJob {
  processingJobId: string;
  assetId: string;
  mediaAssetId?: string;
  storageObjectId: string;
  uploadJobId?: string;
  jobType: MediaProcessingJobType;
  type?: "image" | "audio" | "storage" | "cdn" | "maintenance";
  queueName: string;
  status: MediaProcessingJobStatusValue;
  priority: number;
  progress: number;
  attempts: number;
  maxAttempts: number;
  input: MediaProcessingJobInput;
  outputs: MediaProcessingJobOutput[];
  errors: string[];
  warnings: string[];
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  nextRetryAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MediaAssetProcessingSummary {
  assetId: string;
  overallStatus: "not_started" | "queued" | "processing" | "completed" | "completed_with_warnings" | "failed" | "blocked";
  totalJobs: number;
  queuedJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  progress: number;
  requiredOutputsReady: boolean;
  optionalOutputsReady: boolean;
  requiredOutputs: MediaProcessingOutputReadiness[];
  optionalOutputs: MediaProcessingOutputReadiness[];
  blockingIssues: string[];
  warnings: string[];
  updatedAt: string;
}

export interface MediaProcessingOutputReadiness {
  outputType: string;
  ready: boolean;
  status: MediaProcessingJobStatusValue;
  processingJobId: string;
  updatedAt: string;
}

export interface MediaAssetLink {
  linkId: string;
  assetId: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  status: "active" | "replaced" | "detached";
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MediaAssetVersion {
  versionId: string;
  assetId: string;
  versionNumber: number;
  storageObjectId: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  assetType: string;
  status: "active" | "replaced" | "archived" | "rollback_available" | "deleted";
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminAuditEvent {
  auditEventId: string;
  action: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  summary: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

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
export type MediaPublicationStageType = "entity_validation" | "asset_validation" | "processing_readiness" | "storage_promotion" | "derivative_promotion" | "record_update" | "cdn_activation" | "cdn_invalidation" | "public_sync_verification" | "rollback" | "complete";
export type MediaPublicationStageStatus = "pending" | "active" | "completed" | "failed" | "skipped" | "blocked";
export type MediaPublicationVisibility = "public" | "pending_publication" | "not_public" | "blocked" | "partially_public" | "rolled_back" | "unknown";
export type MediaPublicationLockStatus = "active" | "released" | "expired";

export interface MediaPublicationStage {
  stageId: string;
  publicationOperationId: string;
  stageType: MediaPublicationStageType;
  status: MediaPublicationStageStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

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

export interface MediaPublicationReadinessAsset {
  assetId: string;
  assetType: string;
  required: boolean;
  classification: "required" | "optional" | "private_only" | "already_public" | "blocked" | "missing";
  processingReady: boolean;
  storageReady: boolean;
  publicReady: boolean;
  blockingIssues: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface MediaPublicationReadiness {
  entityType: MediaPublicationEntityType;
  entityId: string;
  ready: boolean;
  processingReady: boolean;
  storageReady: boolean;
  metadataReady: boolean;
  publicMappingReady: boolean;
  requiredAssetsReady: boolean;
  optionalAssetsReady: boolean;
  blockingIssues: string[];
  warnings: string[];
  requiredAssets: MediaPublicationReadinessAsset[];
  optionalAssets: MediaPublicationReadinessAsset[];
  privateOnlyAssets: MediaPublicationReadinessAsset[];
  blockedAssets: MediaPublicationReadinessAsset[];
  missingAssets: MediaPublicationReadinessAsset[];
  checkedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MediaPublicationResult {
  success: boolean;
  publicationOperationId: string;
  entityType: MediaPublicationEntityType;
  entityId: string;
  publicVisibility: MediaPublicationVisibility;
  publishedAssets: string[];
  skippedAssets: string[];
  failedAssets: string[];
  publicUrls: Record<string, string>;
  syncReport?: Record<string, unknown>;
  warnings: string[];
  errors: string[];
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

export interface MediaPublicationLock {
  lockId: string;
  entityType: MediaPublicationEntityType;
  entityId: string;
  publicationOperationId: string;
  actionType: MediaPublicationActionType;
  acquiredAt: string;
  expiresAt: string;
  releasedAt?: string;
  status: MediaPublicationLockStatus;
}

export interface MediaUploadApiResult {
  success: boolean;
  uploadJob?: MediaUploadJob;
  mediaAsset?: MediaAsset;
  storageObject?: MediaStorageObject;
  publicUrl?: string;
  warnings?: string[];
  errors?: string[];
}

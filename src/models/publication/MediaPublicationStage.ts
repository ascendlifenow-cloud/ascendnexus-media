export type MediaPublicationStageType =
  | "entity_validation"
  | "asset_validation"
  | "processing_readiness"
  | "storage_promotion"
  | "derivative_promotion"
  | "record_update"
  | "cdn_activation"
  | "cdn_invalidation"
  | "public_sync_verification"
  | "rollback"
  | "complete";

export type MediaPublicationStageStatus = "pending" | "active" | "completed" | "failed" | "skipped" | "blocked";

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

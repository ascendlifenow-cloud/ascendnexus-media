import type { MediaPublicationOperation, MediaPublicationStage, MediaPublicationStageStatus, MediaPublicationStageType } from "../../models/mediaModels";

export const defaultPublicationStageTypes: MediaPublicationStageType[] = [
  "entity_validation",
  "asset_validation",
  "processing_readiness",
  "storage_promotion",
  "derivative_promotion",
  "record_update",
  "cdn_activation",
  "cdn_invalidation",
  "public_sync_verification",
  "complete",
];

export const createPublicationStages = (publicationOperationId: string): MediaPublicationStage[] =>
  defaultPublicationStageTypes.map((stageType, index) => ({
    stageId: `${publicationOperationId}-${stageType}`,
    publicationOperationId,
    stageType,
    status: index === 0 ? "active" : "pending",
    progress: index === 0 ? 5 : 0,
  }));

export const updatePublicationStage = (
  operation: MediaPublicationOperation,
  stageType: MediaPublicationStageType,
  status: MediaPublicationStageStatus,
  patch: Partial<MediaPublicationStage> = {},
): MediaPublicationOperation => {
  const now = new Date().toISOString();
  return {
    ...operation,
    currentStage: stageType,
    stages: operation.stages.map((stage) => {
      if (stage.stageType !== stageType) return stage;
      return {
        ...stage,
        ...patch,
        status,
        startedAt: stage.startedAt ?? (status === "active" ? now : undefined),
        completedAt: status === "completed" || status === "skipped" || status === "blocked" || status === "failed" ? now : stage.completedAt,
      };
    }),
  };
};

export const calculatePublicationProgress = (stages: readonly MediaPublicationStage[]): number => {
  if (!stages.length) return 0;
  const total = stages.reduce((sum, stage) => sum + (stage.status === "completed" || stage.status === "skipped" ? 100 : stage.progress), 0);
  return Math.round(total / stages.length);
};

export interface MediaPublicationStageRecord {
  stageId: string;
  publicationOperationId: string;
  stageType: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

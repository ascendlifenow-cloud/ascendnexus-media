import type { MediaPublicationEntityType, MediaPublicationStageType } from "../../models/mediaModels";
import { MediaApiError } from "../media/mediaErrorUtils";

export type MediaPublicationErrorCode =
  | "PUBLICATION_ENTITY_NOT_FOUND"
  | "PUBLICATION_ENTITY_NOT_READY"
  | "PUBLICATION_ASSET_MISSING"
  | "PUBLICATION_ASSET_BLOCKED"
  | "PUBLICATION_PROCESSING_PENDING"
  | "PUBLICATION_PROCESSING_FAILED"
  | "PUBLICATION_STORAGE_PROMOTION_FAILED"
  | "PUBLICATION_DERIVATIVE_PROMOTION_FAILED"
  | "PUBLICATION_RECORD_UPDATE_FAILED"
  | "PUBLICATION_CDN_FAILED"
  | "PUBLICATION_SYNC_FAILED"
  | "PUBLICATION_ROLLBACK_FAILED"
  | "PUBLICATION_OPERATION_NOT_FOUND"
  | "PUBLICATION_OPERATION_NOT_RETRYABLE"
  | "PUBLICATION_PERMISSION_DENIED"
  | "PUBLICATION_CANCELED";

export interface PublicationErrorShape {
  code: MediaPublicationErrorCode;
  message: string;
  stage?: MediaPublicationStageType;
  retryable: boolean;
  entityType?: MediaPublicationEntityType;
  entityId?: string;
  publicationOperationId?: string;
}

export const createPublicationError = (input: PublicationErrorShape): MediaApiError => {
  const status = input.code === "PUBLICATION_OPERATION_NOT_FOUND" || input.code === "PUBLICATION_ENTITY_NOT_FOUND" ? 404 : 400;
  return new MediaApiError(input.code, input.message, status, "publication", input.retryable, {
    stage: input.stage,
    entityType: input.entityType,
    entityId: input.entityId,
    publicationOperationId: input.publicationOperationId,
  });
};

export const normalizePublicationErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Publication failed.";
};

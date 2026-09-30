import type { MediaPublicationLock, MediaPublicationOperation, MediaPublicationStage } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class PublicationOperationRepository extends BaseRepository<MediaPublicationOperation & Record<string, unknown>> { constructor() { super("mediaPublicationOperations", "publicationOperationId"); } }
export class PublicationStageRepository extends BaseRepository<MediaPublicationStage & Record<string, unknown>> { constructor() { super("mediaPublicationStages", "stageId"); } }
export class PublicationLockRepository extends BaseRepository<MediaPublicationLock & Record<string, unknown>> { constructor() { super("mediaPublicationLocks", "lockId"); } }
export const publicationOperationRepository = new PublicationOperationRepository();
export const publicationStageRepository = new PublicationStageRepository();
export const publicationLockRepository = new PublicationLockRepository();

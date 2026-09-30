import type { MediaUploadJob, DirectMediaUploadSession } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class UploadJobRepository extends BaseRepository<MediaUploadJob & Record<string, unknown>> { constructor() { super("mediaUploadJobs", "uploadJobId"); } }
export class DirectUploadSessionRepository extends BaseRepository<DirectMediaUploadSession & Record<string, unknown>> { constructor() { super("directMediaUploadSessions", "uploadSessionId"); } }
export const uploadJobRepository = new UploadJobRepository();
export const directUploadSessionRepository = new DirectUploadSessionRepository();

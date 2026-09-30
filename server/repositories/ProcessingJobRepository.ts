import type { MediaProcessingJob } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class ProcessingJobRepository extends BaseRepository<MediaProcessingJob & Record<string, unknown>> { constructor() { super("mediaProcessingJobs", "processingJobId"); } }
export const processingJobRepository = new ProcessingJobRepository();

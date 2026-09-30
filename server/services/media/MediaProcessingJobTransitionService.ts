import type { MediaProcessingJobStatusValue } from "../../models/mediaModels";

const allowedTransitions: Record<MediaProcessingJobStatusValue, MediaProcessingJobStatusValue[]> = {
  queued: ["delayed", "active", "processing", "canceled", "failed", "retrying", "dead_letter"],
  delayed: ["queued", "active", "canceled", "failed", "dead_letter"],
  active: ["queued", "processing", "completed", "failed", "retrying", "canceled", "dead_letter", "skipped"],
  processing: ["queued", "completed", "failed", "retrying", "canceled", "dead_letter", "skipped"],
  completed: [],
  failed: ["retrying", "queued", "dead_letter"],
  retrying: ["queued", "active", "failed", "dead_letter", "canceled"],
  canceled: ["queued"],
  dead_letter: ["queued", "retrying", "skipped"],
  skipped: [],
};

export class MediaProcessingJobTransitionService {
  validateTransition(from: MediaProcessingJobStatusValue, to: MediaProcessingJobStatusValue): boolean {
    if (from === to) return true;
    return allowedTransitions[from]?.includes(to) ?? false;
  }

  assertTransition(from: MediaProcessingJobStatusValue, to: MediaProcessingJobStatusValue): void {
    if (!this.validateTransition(from, to)) {
      throw new Error(`PROCESSING_INVALID_TRANSITION: ${from} cannot transition to ${to}.`);
    }
  }
}

export const mediaProcessingJobTransitionService = new MediaProcessingJobTransitionService();

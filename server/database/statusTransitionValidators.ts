export interface StatusTransitionResult {
  valid: boolean;
  reason?: string;
}

const transitions: Record<string, Record<string, string[]>> = {
  artist: {
    draft: ["active", "archived", "deleted"],
    active: ["archived", "deleted"],
    archived: ["active", "deleted"],
    deleted: [],
  },
  release: {
    draft: ["published", "archived", "deleted"],
    published: ["archived", "deleted"],
    archived: ["draft", "published", "deleted"],
    deleted: [],
  },
  mediaAsset: {
    draft: ["published", "archived", "deleted"],
    published: ["archived", "deleted"],
    archived: ["draft", "deleted"],
    deleted: [],
  },
  galleryItem: {
    draft: ["published", "archived", "deleted"],
    published: ["archived", "deleted"],
    archived: ["draft", "published", "deleted"],
    deleted: [],
  },
  uploadJob: {
    queued: ["validating", "uploading", "failed", "canceled"],
    validating: ["ready", "validation_failed", "failed", "canceled"],
    uploading: ["processing", "completed", "failed", "canceled"],
    processing: ["completed", "failed", "canceled"],
    completed: [],
    failed: ["queued", "canceled"],
    canceled: [],
  },
  processingJob: {
    queued: ["active", "processing", "failed", "canceled", "skipped"],
    active: ["processing", "completed", "failed", "retrying", "canceled"],
    processing: ["completed", "failed", "retrying", "canceled", "skipped"],
    retrying: ["queued", "failed", "dead_letter", "canceled"],
    completed: [],
    failed: ["queued", "dead_letter"],
    canceled: [],
    dead_letter: [],
    skipped: [],
  },
  publicationOperation: {
    requested: ["validating", "blocked", "canceled"],
    validating: ["waiting_for_processing", "promoting_storage", "blocked", "failed", "canceled"],
    waiting_for_processing: ["promoting_storage", "failed", "canceled"],
    promoting_storage: ["updating_records", "failed", "rolling_back"],
    updating_records: ["activating_delivery", "verifying_sync", "failed", "rolling_back"],
    activating_delivery: ["verifying_sync", "failed", "rolling_back"],
    verifying_sync: ["completed", "completed_with_warnings", "failed", "rolling_back"],
    completed: [],
    completed_with_warnings: [],
    failed: ["rolling_back"],
    rolling_back: ["rolled_back", "failed"],
    rolled_back: [],
    canceled: [],
    blocked: ["validating", "canceled"],
  },
  contactSubmission: {
    new: ["in_review", "responded", "resolved", "spam", "archived"],
    in_review: ["responded", "resolved", "spam", "archived"],
    responded: ["resolved", "archived"],
    resolved: ["archived"],
    spam: ["archived"],
    archived: [],
  },
  newsletterSubscription: {
    pending: ["active", "unsubscribed", "suppressed"],
    active: ["unsubscribed", "suppressed", "bounced"],
    unsubscribed: ["suppressed"],
    suppressed: [],
    bounced: ["suppressed", "active"],
  },
};

export const validateStatusTransition = (entityType: keyof typeof transitions, from: string, to: string): StatusTransitionResult => {
  if (from === to) return { valid: true };
  const allowed = transitions[entityType]?.[from] ?? [];
  return allowed.includes(to) ? { valid: true } : { valid: false, reason: `${entityType} cannot transition from ${from} to ${to}.` };
};

export const statusTransitionValidators = {
  validateArtist: (from: string, to: string) => validateStatusTransition("artist", from, to),
  validateRelease: (from: string, to: string) => validateStatusTransition("release", from, to),
  validateMediaAsset: (from: string, to: string) => validateStatusTransition("mediaAsset", from, to),
  validateGalleryItem: (from: string, to: string) => validateStatusTransition("galleryItem", from, to),
  validateUploadJob: (from: string, to: string) => validateStatusTransition("uploadJob", from, to),
  validateProcessingJob: (from: string, to: string) => validateStatusTransition("processingJob", from, to),
  validatePublicationOperation: (from: string, to: string) => validateStatusTransition("publicationOperation", from, to),
  validateContactSubmission: (from: string, to: string) => validateStatusTransition("contactSubmission", from, to),
  validateNewsletterSubscription: (from: string, to: string) => validateStatusTransition("newsletterSubscription", from, to),
};

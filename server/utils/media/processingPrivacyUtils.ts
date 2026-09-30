import type { MediaProcessingJob, MediaProcessingJobOutput } from "../../models/mediaModels";

export const assertProcessingMaintainsFullSongPrivacy = (job: MediaProcessingJob, outputs: readonly MediaProcessingJobOutput[]): void => {
  if (job.input.assetType !== "full_song") return;
  const violations = outputs.filter((output) =>
    Boolean(output.url)
    || String(output.storagePath ?? "").startsWith("public/")
    || output.metadata?.accessLevel === "public"
    || output.metadata?.cdnUrl
  );
  if (violations.length) {
    throw new Error("PROCESSING_PRIVACY_VIOLATION: full-song processing attempted to create public output.");
  }
};

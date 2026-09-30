import {
  buildProcessingAttentionSummary,
  calculateProcessingStats,
  filterProcessingJobs,
  getProcessingJobActionState,
  groupJobsByStatus,
  sortProcessingJobs,
} from "../src/admin/utils/mediaProcessingAdminUtils.ts";

const now = new Date("2026-07-10T12:00:00.000Z").toISOString();
const older = new Date("2026-07-09T12:00:00.000Z").toISOString();

const makeJob = (overrides) => ({
  processingJobId: overrides.processingJobId,
  assetId: overrides.assetId ?? "asset-1",
  storageObjectId: overrides.storageObjectId ?? "storage-1",
  uploadJobId: overrides.uploadJobId,
  jobType: overrides.jobType ?? "image_derivatives",
  queueName: overrides.queueName ?? "media-image",
  status: overrides.status ?? "queued",
  priority: overrides.priority ?? 50,
  progress: overrides.progress ?? 0,
  attempts: overrides.attempts ?? 0,
  maxAttempts: overrides.maxAttempts ?? 3,
  input: overrides.input ?? {
    assetId: overrides.assetId ?? "asset-1",
    storageObjectId: overrides.storageObjectId ?? "storage-1",
    sourceStoragePath: "private/media/input.png",
    assetType: "cover_art",
    mediaCategory: "image",
    requestedOutputs: ["image_derivatives"],
    accessLevel: "admin_only",
  },
  outputs: [],
  errors: overrides.errors ?? [],
  warnings: overrides.warnings ?? [],
  createdAt: overrides.createdAt ?? now,
  updatedAt: overrides.updatedAt ?? now,
  metadata: overrides.metadata ?? {},
});

const jobs = [
  makeJob({ processingJobId: "job-completed", status: "completed", progress: 100, createdAt: older, updatedAt: older }),
  makeJob({ processingJobId: "job-active", status: "processing", progress: 45, jobType: "audio_waveform", queueName: "media-audio", metadata: { required: true } }),
  makeJob({ processingJobId: "job-failed", status: "failed", progress: 100, errors: ["FFMPEG_NOT_AVAILABLE: tool missing"], metadata: { required: true } }),
  makeJob({ processingJobId: "job-dead-letter", status: "dead_letter", progress: 100, assetId: "asset-2", errors: ["CHECKSUM_MISMATCH: hash mismatch"], attempts: 3 }),
];

const health = {
  redisConnected: false,
  workersEnabled: true,
  imageWorker: { running: true, concurrency: 2, failedJobCount: 1 },
  audioWorker: { running: false, concurrency: 1, failedJobCount: 1 },
  storageWorker: { running: true, concurrency: 1, failedJobCount: 0 },
  cdnWorker: { running: true, concurrency: 1, failedJobCount: 0 },
  queueCounts: [],
  ffmpegAvailable: false,
  ffprobeAvailable: false,
  imageProcessorAvailable: true,
  checkedAt: now,
  warnings: ["Redis fallback mode active."],
  errors: [],
};

const stats = calculateProcessingStats(jobs, health);
if (stats.activeJobs !== 1 || stats.failedJobs !== 1 || stats.deadLetterJobs !== 1) {
  throw new Error(`Unexpected stats: ${JSON.stringify(stats)}`);
}

const counts = groupJobsByStatus(jobs);
if (counts.completed !== 1 || counts.active !== 1 || counts.failed !== 1 || counts.dead_letter !== 1 || counts.all !== 4) {
  throw new Error(`Unexpected tab counts: ${JSON.stringify(counts)}`);
}

const failedJobs = filterProcessingJobs(jobs, {
  searchQuery: "ffmpeg",
  statusFilter: "all",
  jobTypeFilter: "all",
  queueFilter: "all",
  assetTypeFilter: "all",
  activeTab: "failed",
});
if (failedJobs.length !== 1 || failedJobs[0].processingJobId !== "job-failed") {
  throw new Error("Failed job search/tab filter did not isolate the expected job.");
}

const newest = sortProcessingJobs(jobs, "newest");
if (newest[0].processingJobId !== "job-active" && newest[0].processingJobId !== "job-failed" && newest[0].processingJobId !== "job-dead-letter") {
  throw new Error("Newest sorting did not keep current jobs first.");
}
if (jobs[0].processingJobId !== "job-completed") throw new Error("Sorting mutated the source job list.");

const retryAction = getProcessingJobActionState(jobs[2]);
if (!retryAction.retryable) throw new Error("Failed job should be retryable.");
const cancelAction = getProcessingJobActionState(jobs[1]);
if (cancelAction.cancelable) throw new Error("Required active job should not be cancelable by default.");

const attention = buildProcessingAttentionSummary(jobs, health);
if (!attention.visible || attention.requiredFailures !== 1 || attention.deadLetterJobs !== 1 || !attention.commonFailureCodes.includes("FFMPEG_NOT_AVAILABLE")) {
  throw new Error(`Unexpected attention summary: ${JSON.stringify(attention)}`);
}

console.log(JSON.stringify({
  success: true,
  stats,
  counts,
  attentionIssues: attention.issues.length,
}, null, 2));

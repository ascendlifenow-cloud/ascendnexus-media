import type { MediaProcessingHealth, MediaProcessingJob, MediaProcessingJobStatusValue, MediaProcessingJobType } from "../../models/media";

export type ProcessingStatusFilter = "all" | MediaProcessingJobStatusValue;
export type ProcessingJobTypeFilter = "all" | MediaProcessingJobType;
export type ProcessingQueueFilter = "all" | "image" | "audio" | "storage" | "cdn" | "publication" | "maintenance" | "dead_letter";
export type ProcessingAssetTypeFilter = "all" | string;
export type ProcessingSortMode = "newest" | "oldest" | "highest_progress" | "lowest_progress" | "most_attempts" | "job_type" | "status" | "priority";
export type ProcessingTabKey = "active" | "queued" | "failed" | "dead_letter" | "completed" | "all";

export const formatProcessingJobType = (jobType: string): string =>
  jobType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export const formatProcessingStatus = (status: string): string =>
  status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export const formatQueueName = (queueName: string): string =>
  queueName.replace(/^media-/, "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export const formatProcessingErrorCode = (message: string | undefined): string => {
  if (!message) return "PROCESSING_UNKNOWN";
  const code = /^[A-Z_]+:/.exec(message)?.[0]?.replace(":", "");
  return code || "PROCESSING_ERROR";
};

export const getProcessingJobDisplayLabel = (job: MediaProcessingJob): string =>
  `${formatProcessingJobType(job.jobType)} • ${job.processingJobId.slice(-8)}`;

export const getProcessingRequirementState = (job: MediaProcessingJob): "required" | "optional" | "unknown" => {
  if (job.metadata?.required === true) return "required";
  if (job.metadata?.required === false) return "optional";
  return "unknown";
};

export const getProcessingJobActionState = (job: MediaProcessingJob) => {
  const requirement = getProcessingRequirementState(job);
  const retryable = ["failed", "dead_letter", "retrying"].includes(job.status) && job.attempts < job.maxAttempts;
  const cancelable = ["queued", "delayed", "retrying"].includes(job.status) || (requirement !== "required" && ["active", "processing"].includes(job.status));
  return {
    retryable,
    cancelable,
    retryDisabledReason: retryable ? undefined : job.attempts >= job.maxAttempts ? "Retry limit reached" : "Job is not in a retryable state",
    cancelDisabledReason: cancelable ? undefined : requirement === "required" && ["active", "processing"].includes(job.status) ? "Required active jobs are protected" : "Job is not cancelable",
  };
};

export const calculateProcessingStats = (jobs: readonly MediaProcessingJob[], health?: MediaProcessingHealth) => {
  const activeJobs = jobs.filter((job) => ["active", "processing", "retrying"].includes(job.status)).length;
  const queuedJobs = jobs.filter((job) => ["queued", "delayed"].includes(job.status)).length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const deadLetterJobs = jobs.filter((job) => job.status === "dead_letter").length;
  const processingAssets = new Set(jobs.map((job) => job.assetId)).size;
  const activeWorkers = [health?.imageWorker, health?.audioWorker, health?.storageWorker, health?.cdnWorker, health?.publicationWorker].filter((worker) => worker?.running).length;
  const overallStatus = !health ? "Unknown" : !health.workersEnabled ? "Workers Disabled" : health.errors.length ? "Unavailable" : failedJobs || deadLetterJobs || health.warnings.length ? "Degraded" : "Healthy";
  return {
    overallStatus,
    redisConnection: health?.redisConnected ? "Connected" : "Fallback",
    activeWorkers,
    activeJobs,
    queuedJobs,
    failedJobs,
    deadLetterJobs,
    processingAssets,
  };
};

export const groupJobsByStatus = (jobs: readonly MediaProcessingJob[]) => ({
  active: jobs.filter((job) => ["active", "processing", "retrying"].includes(job.status)).length,
  queued: jobs.filter((job) => ["queued", "delayed"].includes(job.status)).length,
  failed: jobs.filter((job) => job.status === "failed").length,
  dead_letter: jobs.filter((job) => job.status === "dead_letter").length,
  completed: jobs.filter((job) => ["completed", "skipped"].includes(job.status)).length,
  all: jobs.length,
});

const queueMatches = (queueName: string, filter: ProcessingQueueFilter): boolean => {
  if (filter === "all") return true;
  if (filter === "dead_letter") return queueName.includes("dead-letter");
  return queueName.includes(filter);
};

export const filterProcessingJobs = (
  jobs: readonly MediaProcessingJob[],
  filters: {
    searchQuery: string;
    statusFilter: ProcessingStatusFilter;
    jobTypeFilter: ProcessingJobTypeFilter;
    queueFilter: ProcessingQueueFilter;
    assetTypeFilter: ProcessingAssetTypeFilter;
    activeTab: ProcessingTabKey;
  },
): MediaProcessingJob[] => {
  const search = filters.searchQuery.trim().toLowerCase();
  return jobs.filter((job) => {
    const tabMatches =
      filters.activeTab === "all" ||
      (filters.activeTab === "active" && ["active", "processing", "retrying"].includes(job.status)) ||
      (filters.activeTab === "queued" && ["queued", "delayed"].includes(job.status)) ||
      (filters.activeTab === "failed" && job.status === "failed") ||
      (filters.activeTab === "dead_letter" && job.status === "dead_letter") ||
      (filters.activeTab === "completed" && ["completed", "skipped"].includes(job.status));
    const statusMatches = filters.statusFilter === "all" || job.status === filters.statusFilter;
    const typeMatches = filters.jobTypeFilter === "all" || job.jobType === filters.jobTypeFilter;
    const queueMatch = queueMatches(job.queueName, filters.queueFilter);
    const assetType = typeof job.input?.assetType === "string" ? job.input.assetType : "";
    const assetTypeMatches = filters.assetTypeFilter === "all" || assetType === filters.assetTypeFilter;
    const searchMatches = !search || [
      job.processingJobId,
      job.assetId,
      job.storageObjectId,
      job.uploadJobId,
      job.jobType,
      job.queueName,
      assetType,
      ...(job.errors ?? []),
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));
    return tabMatches && statusMatches && typeMatches && queueMatch && assetTypeMatches && searchMatches;
  });
};

export const sortProcessingJobs = (jobs: readonly MediaProcessingJob[], sortMode: ProcessingSortMode): MediaProcessingJob[] =>
  [...jobs].sort((a, b) => {
    if (sortMode === "oldest") return a.createdAt.localeCompare(b.createdAt);
    if (sortMode === "highest_progress") return b.progress - a.progress;
    if (sortMode === "lowest_progress") return a.progress - b.progress;
    if (sortMode === "most_attempts") return b.attempts - a.attempts;
    if (sortMode === "job_type") return a.jobType.localeCompare(b.jobType);
    if (sortMode === "status") return a.status.localeCompare(b.status);
    if (sortMode === "priority") return a.priority - b.priority;
    return b.createdAt.localeCompare(a.createdAt);
  });

export const buildProcessingAttentionSummary = (jobs: readonly MediaProcessingJob[], health?: MediaProcessingHealth) => {
  const requiredFailures = jobs.filter((job) => getProcessingRequirementState(job) === "required" && ["failed", "dead_letter"].includes(job.status));
  const deadLetterJobs = jobs.filter((job) => job.status === "dead_letter");
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const commonFailureCodes = [...new Set([...requiredFailures, ...deadLetterJobs, ...failedJobs].map((job) => formatProcessingErrorCode(job.errors?.[0])))];
  const oldestFailure = [...requiredFailures, ...deadLetterJobs, ...failedJobs].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
  const issues = [
    ...(requiredFailures.length ? [`${requiredFailures.length} required processing job${requiredFailures.length === 1 ? "" : "s"} failed.`] : []),
    ...(deadLetterJobs.length ? [`${deadLetterJobs.length} job${deadLetterJobs.length === 1 ? "" : "s"} reached dead letter.`] : []),
    ...(health && !health.workersEnabled ? ["Workers are disabled."] : []),
    ...(health && !health.redisConnected ? ["Redis is not connected; fallback queue mode is active."] : []),
    ...(health && !health.imageProcessorAvailable ? ["Image processing library is not available."] : []),
    ...(health && !health.ffmpegAvailable ? ["FFmpeg is not available."] : []),
  ];
  return {
    visible: issues.length > 0,
    affectedAssets: new Set([...requiredFailures, ...deadLetterJobs, ...failedJobs].map((job) => job.assetId)).size,
    requiredFailures: requiredFailures.length,
    deadLetterJobs: deadLetterJobs.length,
    oldestUnresolvedFailure: oldestFailure?.updatedAt,
    commonFailureCodes,
    suggestedAction: deadLetterJobs.length ? "Review dead-letter jobs and retry after correcting the underlying issue." : "Review worker health and retry eligible failed jobs.",
    issues,
  };
};

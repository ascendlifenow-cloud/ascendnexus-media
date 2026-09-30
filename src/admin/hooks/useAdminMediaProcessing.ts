import { useCallback, useEffect, useState } from "react";
import type { MediaProcessingHealth, MediaProcessingJob } from "../../models/media";
import { adminMediaProcessingService } from "../services/AdminMediaProcessingService";
import { calculateProcessingStats } from "../utils/mediaProcessingAdminUtils";

export const useAdminMediaProcessing = () => {
  const [jobs, setJobs] = useState<MediaProcessingJob[]>([]);
  const [health, setHealth] = useState<MediaProcessingHealth | undefined>();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [jobsResponse, healthResponse] = await Promise.all([
      adminMediaProcessingService.listProcessingJobs(),
      adminMediaProcessingService.getProcessingHealth(),
    ]);
    setJobs(jobsResponse.processingJobs ?? []);
    setHealth(healthResponse.health);
    setErrors([...(jobsResponse.errors ?? []), ...(healthResponse.errors ?? [])]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const hasActiveJobs = jobs.some((job) => ["active", "processing", "retrying"].includes(job.status));
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, hasActiveJobs ? 8000 : 30000);
    return () => window.clearInterval(interval);
  }, [jobs, refresh]);

  const retryJob = useCallback(async (processingJobId: string) => {
    await adminMediaProcessingService.retryProcessingJob(processingJobId);
    await refresh();
  }, [refresh]);

  const cancelJob = useCallback(async (processingJobId: string) => {
    await adminMediaProcessingService.cancelProcessingJob(processingJobId);
    await refresh();
  }, [refresh]);

  const pauseQueue = useCallback(async (queueName: string) => {
    await adminMediaProcessingService.pauseQueue(queueName);
    await refresh();
  }, [refresh]);

  const resumeQueue = useCallback(async (queueName: string) => {
    await adminMediaProcessingService.resumeQueue(queueName);
    await refresh();
  }, [refresh]);

  return {
    jobs,
    health,
    loading,
    errors,
    stats: calculateProcessingStats(jobs, health),
    refresh,
    retryJob,
    cancelJob,
    pauseQueue,
    resumeQueue,
  };
};

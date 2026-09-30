import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaProcessingHealth, MediaProcessingJob } from "../../models/media";
import { mediaProcessingApiService } from "../../services/media/MediaProcessingApiService";

export const useMediaProcessingJobs = () => {
  const [jobs, setJobs] = useState<MediaProcessingJob[]>([]);
  const [health, setHealth] = useState<MediaProcessingHealth | undefined>();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [jobsResponse, healthResponse] = await Promise.all([
      mediaProcessingApiService.listJobs(),
      mediaProcessingApiService.getHealth(),
    ]);
    setJobs(jobsResponse.processingJobs ?? []);
    setHealth(healthResponse.health);
    setErrors([...(jobsResponse.errors ?? []), ...(healthResponse.errors ?? [])]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const retryJob = useCallback(async (processingJobId: string) => {
    await mediaProcessingApiService.retryJob(processingJobId);
    await refresh();
  }, [refresh]);

  const cancelJob = useCallback(async (processingJobId: string) => {
    await mediaProcessingApiService.cancelJob(processingJobId);
    await refresh();
  }, [refresh]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.processingJobId === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId],
  );

  return {
    jobs,
    health,
    selectedJob,
    loading,
    errors,
    refresh,
    retryJob,
    cancelJob,
    selectJob: setSelectedJobId,
  };
};

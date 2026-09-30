import { useMemo, useState } from "react";
import type { MediaProcessingJob } from "../../models/media";

export const useSelectedProcessingJob = (jobs: readonly MediaProcessingJob[]) => {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const selectedJob = useMemo(
    () => jobs.find((job) => job.processingJobId === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId],
  );
  return {
    selectedJob,
    selectedJobId: selectedJob?.processingJobId,
    selectJob: setSelectedJobId,
    clearSelectedJob: () => setSelectedJobId(undefined),
  };
};

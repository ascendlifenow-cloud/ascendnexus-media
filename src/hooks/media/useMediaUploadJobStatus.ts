import { useEffect, useState } from "react";
import type { MediaUploadJob } from "../../models/media";
import { mediaUploadJobService } from "../../services/media";

export interface UseMediaUploadJobStatusResult {
  job: MediaUploadJob | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useMediaUploadJobStatus = (
  uploadJobId: string | null | undefined,
  pollingMs = 1200,
): UseMediaUploadJobStatusResult => {
  const [job, setJob] = useState<MediaUploadJob | null>(null);
  const [loading, setLoading] = useState(Boolean(uploadJobId));
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!uploadJobId) {
      setJob(null);
      setLoading(false);
      return;
    }
    try {
      setJob(mediaUploadJobService.getUploadJob(uploadJobId));
      setError(null);
    } catch {
      setError("Upload job status is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    if (!uploadJobId || pollingMs <= 0 || typeof window === "undefined") return undefined;
    const timer = window.setInterval(refresh, pollingMs);
    return () => window.clearInterval(timer);
  }, [uploadJobId, pollingMs]);

  return { job, loading, error, refresh };
};

import { useEffect, useState } from "react";
import type { MediaProcessingJobStatus } from "../../models/media";
import { mediaProcessingJobStatusService } from "../../services/media";

export interface UseMediaProcessingJobStatusResult {
  status: MediaProcessingJobStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useMediaProcessingJobStatus = (
  processingJobId: string | null | undefined,
  pollingMs = 1200,
): UseMediaProcessingJobStatusResult => {
  const [status, setStatus] = useState<MediaProcessingJobStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(processingJobId));
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!processingJobId) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      setStatus(mediaProcessingJobStatusService.getProcessingStatus(processingJobId));
      setError(null);
    } catch {
      setError("Processing job status is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    if (!processingJobId || pollingMs <= 0 || typeof window === "undefined") return undefined;
    const timer = window.setInterval(refresh, pollingMs);
    return () => window.clearInterval(timer);
  }, [processingJobId, pollingMs]);

  return { status, loading, error, refresh };
};

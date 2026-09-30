import { useCallback, useEffect, useState } from "react";
import type { MediaPublicationOperation, MediaPublicationResult } from "../../models/publication";
import { adminMediaPublicationService } from "../services/AdminMediaPublicationService";

const activeStatuses = new Set(["requested", "validating", "waiting_for_processing", "promoting_storage", "updating_records", "activating_delivery", "verifying_sync", "rolling_back"]);

export const usePublicationOperation = (publicationOperationId: string | undefined) => {
  const [operation, setOperation] = useState<MediaPublicationOperation | undefined>();
  const [result, setResult] = useState<MediaPublicationResult | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicationOperationId) return;
    setLoading(true);
    const response = await adminMediaPublicationService.getPublicationOperation(publicationOperationId);
    setOperation(response.publicationOperation);
    setResult(response.result);
    setErrors(response.errors ?? []);
    setLoading(false);
  }, [publicationOperationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!operation || !activeStatuses.has(operation.status)) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [operation, refresh]);

  return { operation, result, loading, errors, refresh };
};

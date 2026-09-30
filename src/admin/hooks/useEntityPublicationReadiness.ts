import { useCallback, useEffect, useState } from "react";
import type { MediaPublicationEntityType, MediaPublicationReadiness } from "../../models/publication";
import { adminMediaPublicationService } from "../services/AdminMediaPublicationService";

export const useEntityPublicationReadiness = (entityType: MediaPublicationEntityType | undefined, entityId: string | undefined) => {
  const [readiness, setReadiness] = useState<MediaPublicationReadiness | undefined>();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!entityType || !entityId) {
      setReadiness(undefined);
      return;
    }
    setLoading(true);
    const response = await adminMediaPublicationService.getPublicationReadiness(entityType, entityId);
    setReadiness(response.readiness);
    setErrors(response.errors ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { readiness, loading, errors, refresh };
};

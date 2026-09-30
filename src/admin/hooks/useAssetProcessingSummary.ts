import { useCallback, useEffect, useState } from "react";
import type { MediaAssetProcessingSummary } from "../../models/media";
import { adminMediaProcessingService } from "../services/AdminMediaProcessingService";

export const useAssetProcessingSummary = (assetId: string | undefined) => {
  const [summary, setSummary] = useState<MediaAssetProcessingSummary | undefined>();
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!assetId) {
      setSummary(undefined);
      return;
    }
    setLoading(true);
    const response = await adminMediaProcessingService.getAssetProcessingSummary(assetId);
    setSummary(response.summary);
    setLoading(false);
  }, [assetId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, refresh };
};

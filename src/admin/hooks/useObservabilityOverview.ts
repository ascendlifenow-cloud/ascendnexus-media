import { useCallback, useEffect, useState } from "react";
import { adminObservabilityApiService } from "../services/AdminObservabilityApiService";

export function useObservabilityOverview() {
  const [overview, setOverview] = useState<Record<string, unknown> | undefined>();
  const [certification, setCertification] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [overviewResult, certificationResult] = await Promise.all([
      adminObservabilityApiService.getOverview(),
      adminObservabilityApiService.getCertification(),
    ]);
    setOverview(overviewResult.data);
    setCertification(certificationResult.data);
    setErrors([...(overviewResult.errors ?? []), ...(certificationResult.errors ?? [])]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { overview, certification, loading, errors, refresh };
}

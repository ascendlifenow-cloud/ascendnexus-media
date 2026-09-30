import { useCallback, useEffect, useState } from "react";
import { adminDeploymentApiService } from "../services/AdminDeploymentApiService";

export const useDeploymentOverview = () => {
  const [overview, setOverview] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await adminDeploymentApiService.getOverview();
    setOverview(result.data);
    setErrors(result.errors ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verify = useCallback(async () => {
    const result = await adminDeploymentApiService.verify();
    await refresh();
    return result;
  }, [refresh]);

  return { overview, loading, errors, refresh, verify };
};

import { useCallback, useEffect, useState } from "react";
import { adminDistributionApiService } from "../services/AdminDistributionApiService";

export function useDistributionOverview() {
  const [overview, setOverview] = useState<Record<string, unknown> | undefined>();
  const [jobs, setJobs] = useState<unknown[]>([]);
  const [connectors, setConnectors] = useState<unknown[]>([]);
  const [analytics, setAnalytics] = useState<unknown[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [queue, setQueue] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [overviewResult, jobsResult, connectorsResult, queueResult, analyticsResult, historyResult] = await Promise.all([
      adminDistributionApiService.getOverview(),
      adminDistributionApiService.getJobs(),
      adminDistributionApiService.getConnectors(),
      adminDistributionApiService.getQueues(),
      adminDistributionApiService.getAnalytics(),
      adminDistributionApiService.getHistory(),
    ]);
    setOverview(overviewResult.data);
    setJobs(Array.isArray(jobsResult.data) ? jobsResult.data : []);
    setConnectors(Array.isArray(connectorsResult.data) ? connectorsResult.data : []);
    setQueue(queueResult.data);
    setAnalytics(Array.isArray(analyticsResult.data) ? analyticsResult.data : []);
    setHistory(Array.isArray(historyResult.data) ? historyResult.data : []);
    setErrors([...(overviewResult.errors ?? []), ...(jobsResult.errors ?? []), ...(connectorsResult.errors ?? []), ...(queueResult.errors ?? []), ...(analyticsResult.errors ?? []), ...(historyResult.errors ?? [])]);
    setLoading(false);
  }, []);

  const retryFailures = useCallback(async () => {
    await adminDistributionApiService.retryFailures();
    await refresh();
  }, [refresh]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { overview, jobs, connectors, queue, analytics, history, loading, errors, refresh, retryFailures };
}

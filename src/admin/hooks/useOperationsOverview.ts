import { useCallback, useEffect, useState } from "react";
import { adminOperationsApiService } from "../services/AdminOperationsApiService";

export function useOperationsOverview() {
  const [overview, setOverview] = useState<Record<string, unknown> | undefined>();
  const [calendar, setCalendar] = useState<unknown[]>([]);
  const [workflows, setWorkflows] = useState<unknown[]>([]);
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [verifications, setVerifications] = useState<unknown[]>([]);
  const [recommendations, setRecommendations] = useState<unknown[]>([]);
  const [reports, setReports] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [overviewResult, calendarResult, workflowsResult, campaignsResult, verificationResult, recommendationsResult, reportsResult] = await Promise.all([
      adminOperationsApiService.getOverview(),
      adminOperationsApiService.getCalendar(),
      adminOperationsApiService.getWorkflows(),
      adminOperationsApiService.getCampaigns(),
      adminOperationsApiService.getVerification(),
      adminOperationsApiService.getRecommendations(),
      adminOperationsApiService.getReports(),
    ]);
    setOverview(overviewResult.data);
    setCalendar(Array.isArray(calendarResult.data) ? calendarResult.data : []);
    setWorkflows(Array.isArray(workflowsResult.data) ? workflowsResult.data : []);
    setCampaigns(Array.isArray(campaignsResult.data) ? campaignsResult.data : []);
    setVerifications(Array.isArray(verificationResult.data) ? verificationResult.data : []);
    setRecommendations(Array.isArray(recommendationsResult.data) ? recommendationsResult.data : []);
    setReports(Array.isArray(reportsResult.data) ? reportsResult.data : []);
    setErrors([
      ...(overviewResult.errors ?? []),
      ...(calendarResult.errors ?? []),
      ...(workflowsResult.errors ?? []),
      ...(campaignsResult.errors ?? []),
      ...(verificationResult.errors ?? []),
      ...(recommendationsResult.errors ?? []),
      ...(reportsResult.errors ?? []),
    ]);
    setLoading(false);
  }, []);

  const runVerification = useCallback(async () => {
    await adminOperationsApiService.runVerification();
    await refresh();
  }, [refresh]);

  const generateReport = useCallback(async () => {
    await adminOperationsApiService.generateReport("daily");
    await refresh();
  }, [refresh]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { overview, calendar, workflows, campaigns, verifications, recommendations, reports, loading, errors, refresh, runVerification, generateReport };
}

import { useCallback, useEffect, useState } from "react";
import { adminIntelligenceApiService } from "../services/AdminIntelligenceApiService";

export function useIntelligenceOverview() {
  const [overview, setOverview] = useState<Record<string, unknown> | undefined>();
  const [audience, setAudience] = useState<Record<string, unknown> | undefined>();
  const [platforms, setPlatforms] = useState<Record<string, unknown> | undefined>();
  const [content, setContent] = useState<Record<string, unknown> | undefined>();
  const [forecasts, setForecasts] = useState<unknown[]>([]);
  const [reports, setReports] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [overviewResult, audienceResult, platformsResult, contentResult, forecastsResult, reportsResult] = await Promise.all([
      adminIntelligenceApiService.getOverview(),
      adminIntelligenceApiService.getAudience(),
      adminIntelligenceApiService.getPlatforms(),
      adminIntelligenceApiService.getContent(),
      adminIntelligenceApiService.getForecasts(),
      adminIntelligenceApiService.getReports(),
    ]);
    setOverview(overviewResult.data);
    setAudience(audienceResult.data);
    setPlatforms(platformsResult.data);
    setContent(contentResult.data);
    setForecasts(Array.isArray(forecastsResult.data) ? forecastsResult.data : []);
    setReports(Array.isArray(reportsResult.data) ? reportsResult.data : []);
    setErrors([...(overviewResult.errors ?? []), ...(audienceResult.errors ?? []), ...(platformsResult.errors ?? []), ...(contentResult.errors ?? []), ...(forecastsResult.errors ?? []), ...(reportsResult.errors ?? [])]);
    setLoading(false);
  }, []);

  const generateInsights = useCallback(async () => {
    await adminIntelligenceApiService.generateRecommendations();
    await adminIntelligenceApiService.generateForecasts();
    await adminIntelligenceApiService.generateReport();
    await refresh();
  }, [refresh]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { overview, audience, platforms, content, forecasts, reports, loading, errors, refresh, generateInsights };
}

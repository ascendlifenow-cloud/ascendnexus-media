import { performanceBaselineRepository } from "../../repositories/observability/ObservabilityRepository";

const thresholds: Record<string, number> = {
  api_p95_ms: 0.25,
  homepage_lcp_ms: 0.2,
  bundle_kb: 0.15,
  search_p95_ms: 0.25,
  audio_start_ms: 0.25,
};

export class PerformanceRegressionGateService {
  async buildDecision(scenario = "public-api") {
    const baselines = (await performanceBaselineRepository.list({ includeArchived: true })).filter((baseline) => baseline.scenario === scenario);
    if (baselines.length < 2) return { decision: "approved_with_warnings", scenario, warnings: ["Insufficient performance baseline history for regression comparison."], regressions: [], checkedAt: new Date().toISOString() };
    const [current, previous] = baselines.sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    const regressions = Object.entries(current.metrics).flatMap(([metric, value]) => {
      const old = previous.metrics[metric];
      if (!old) return [];
      const delta = (value - old) / old;
      return delta > (thresholds[metric] ?? 0.25) ? [{ metric, delta, previous: old, current: value }] : [];
    });
    return { decision: regressions.length ? "blocked" : "approved", scenario, regressions, warnings: [], checkedAt: new Date().toISOString() };
  }
}

export const performanceRegressionGateService = new PerformanceRegressionGateService();

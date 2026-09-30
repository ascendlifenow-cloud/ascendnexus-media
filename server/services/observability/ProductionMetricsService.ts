import { getBackendConfig } from "../../config/backendConfig";
import { metricCardinalityPolicy } from "./MetricCardinalityPolicy";
import { observabilityContextService } from "./ObservabilityContextService";

export interface MetricSample {
  type: "counter" | "gauge" | "histogram" | "timing";
  name: string;
  value: number;
  attributes: Record<string, unknown>;
  recordedAt: string;
}

const metricNamePattern = /^anm_[a-z0-9_]+$/;

export class ProductionMetricsService {
  private readonly samples: MetricSample[] = [];

  counter(name: string, value = 1, attributes: Record<string, unknown> = {}) { this.record("counter", name, value, attributes); }
  gauge(name: string, value: number, attributes: Record<string, unknown> = {}) { this.record("gauge", name, value, attributes); }
  histogram(name: string, value: number, attributes: Record<string, unknown> = {}) { this.record("histogram", name, value, attributes); }
  timing(name: string, duration: number, attributes: Record<string, unknown> = {}) { this.record("timing", name, duration, attributes); }
  recordError(code: string, attributes: Record<string, unknown> = {}) { this.counter("anm_http_errors_total", 1, { ...attributes, errorCode: code }); }
  recordDependencyCall(dependency: string, status: string, duration: number) { this.timing("anm_dependency_call_duration_ms", duration, { dependency, result: status }); }
  flush() { return { exported: this.samples.length, provider: getBackendConfig().monitoring.provider, checkedAt: new Date().toISOString() }; }
  shutdown() { return this.flush(); }
  getRecentSamples() { return [...this.samples.slice(-100)]; }
  getHealth() {
    const config = getBackendConfig();
    return {
      status: config.monitoring.enabled ? "healthy" : "disabled",
      provider: config.monitoring.provider,
      sampleCount: this.samples.length,
      warnings: config.monitoring.enabled ? [] : ["Monitoring provider is disabled; local in-process metrics are available only for verification."],
      checkedAt: new Date().toISOString(),
    };
  }

  private record(type: MetricSample["type"], name: string, value: number, attributes: Record<string, unknown>) {
    if (!metricNamePattern.test(name)) throw Object.assign(new Error(`Invalid metric name ${name}.`), { code: "OBSERVABILITY_METRIC_INVALID", status: 400 });
    const validation = metricCardinalityPolicy.validateAttributes(attributes);
    if (!validation.valid) throw Object.assign(new Error(validation.violations.join(" ")), { code: "OBSERVABILITY_CARDINALITY_VIOLATION", status: 400 });
    this.samples.push({ type, name, value, attributes: observabilityContextService.sanitize(metricCardinalityPolicy.sanitizeAttributes(attributes)), recordedAt: new Date().toISOString() });
    if (this.samples.length > 1000) this.samples.splice(0, this.samples.length - 1000);
  }
}

export const productionMetricsService = new ProductionMetricsService();

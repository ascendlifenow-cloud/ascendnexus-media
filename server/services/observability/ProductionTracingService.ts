import crypto from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import { observabilityContextService } from "./ObservabilityContextService";

export class ProductionTracingService {
  startSpan(name: string, attributes: Record<string, unknown> = {}) {
    const startedAt = Date.now();
    const span = { traceId: crypto.randomUUID(), spanId: crypto.randomUUID(), name: name.slice(0, 120), attributes: observabilityContextService.sanitize(attributes), startedAt: new Date(startedAt).toISOString() };
    return { ...span, end: (extra: Record<string, unknown> = {}) => ({ ...span, durationMs: Date.now() - startedAt, endedAt: new Date().toISOString(), attributes: observabilityContextService.sanitize({ ...attributes, ...extra }) }) };
  }
  getHealth() {
    const config = getBackendConfig();
    return { status: config.monitoring.enabled && config.monitoring.tracesSampleRate > 0 ? "healthy" : "disabled", sampleRate: config.monitoring.tracesSampleRate, provider: config.monitoring.provider, checkedAt: new Date().toISOString() };
  }
}

export const productionTracingService = new ProductionTracingService();

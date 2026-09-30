import { getBackendConfig } from "../../config/backendConfig";
import { observabilityContextService } from "./ObservabilityContextService";

export class ProductionErrorMonitoringService {
  captureException(error: unknown, context: Record<string, unknown> = {}) {
    return this.captureMessage(error instanceof Error ? error.message : "Unknown exception", "error", { ...context, errorCode: error instanceof Error ? error.name : "UNKNOWN" });
  }
  captureMessage(message: string, level: "debug" | "info" | "warning" | "error" | "fatal" = "info", context: Record<string, unknown> = {}) {
    return { captured: getBackendConfig().monitoring.enabled, level, message: message.slice(0, 300), context: observabilityContextService.sanitize(context), checkedAt: new Date().toISOString() };
  }
  setRelease(_release: string) {}
  setEnvironment(_environment: string) {}
  addBreadcrumb(_breadcrumb: Record<string, unknown>) {}
  setSafeTag(_key: string, _value: string) {}
  flush() { return { flushed: true, checkedAt: new Date().toISOString() }; }
  shutdown() { return this.flush(); }
  getHealth() {
    const config = getBackendConfig();
    return { status: config.monitoring.enabled && config.monitoring.provider !== "none" ? "healthy" : "disabled", provider: config.monitoring.provider, release: config.monitoring.release, checkedAt: new Date().toISOString() };
  }
}

export const productionErrorMonitoringService = new ProductionErrorMonitoringService();

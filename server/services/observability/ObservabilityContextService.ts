import { getBackendConfig } from "../../config/backendConfig";

const forbiddenContextKeys = /email|name|phone|message|password|token|cookie|authorization|signed|private|full.?song|search.?query/i;

export interface ObservabilityContext {
  service: string;
  environment: string;
  releaseVersion: string;
  commitSha?: string;
  instanceId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  queueName?: string;
  operationId?: string;
  publicationOperationId?: string;
  deploymentReleaseId?: string;
  routeTemplate?: string;
  entityType?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export class ObservabilityContextService {
  baseContext(extra: Partial<ObservabilityContext> = {}): ObservabilityContext {
    const config = getBackendConfig();
    return this.sanitize({
      service: config.app.serviceName,
      environment: config.app.environment,
      releaseVersion: config.app.version,
      commitSha: config.app.commitSha,
      instanceId: config.app.instanceId,
      ...extra,
    });
  }

  sanitize<T extends Record<string, unknown>>(context: T): T {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (forbiddenContextKeys.test(key)) continue;
      if (typeof value === "string") clean[key] = value.replace(/(token=|signature=)[^&\s]+/gi, "$1[REDACTED]").slice(0, 240);
      else if (value && typeof value === "object" && !Array.isArray(value)) clean[key] = this.sanitize(value as Record<string, unknown>);
      else clean[key] = value;
    }
    return clean as T;
  }
}

export const observabilityContextService = new ObservabilityContextService();

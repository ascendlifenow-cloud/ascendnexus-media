const forbiddenAttributePatterns = [/requestid/i, /traceid/i, /userid/i, /email/i, /entityid/i, /slug/i, /url/i, /query/i, /filename/i, /path/i, /jobid/i, /session/i, /token/i, /ip/i, /cookie/i, /authorization/i];
const allowedAttributes = new Set(["service", "environment", "routeTemplate", "method", "statusClass", "errorCode", "jobType", "queue", "entityType", "providerCategory", "result", "cacheStatus", "releaseVersion", "dependency", "operation", "severity"]);

export class MetricCardinalityPolicy {
  validateAttributes(attributes: Record<string, unknown> = {}) {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(attributes)) {
      if (!allowedAttributes.has(key) || forbiddenAttributePatterns.some((pattern) => pattern.test(key))) violations.push(`Forbidden metric attribute: ${key}`);
      if (typeof value === "string" && value.length > 80) violations.push(`Metric attribute ${key} exceeds safe length.`);
    }
    return { valid: violations.length === 0, violations };
  }

  sanitizeAttributes(attributes: Record<string, unknown> = {}) {
    return Object.fromEntries(Object.entries(attributes).filter(([key]) => allowedAttributes.has(key) && !forbiddenAttributePatterns.some((pattern) => pattern.test(key))).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 80) : value]));
  }
}

export const metricCardinalityPolicy = new MetricCardinalityPolicy();

const forbiddenKey = /email|phone|message|name|token|address|authorization|cookie|signed|storage|fullsong|full_song|private|admin/i;
const forbiddenValue = /@|token=|signature=|x-amz-|\/private|private\/|storage\/objects|fullsong|full-song|full_song/i;

export class AnalyticsDataMinimizationService {
  sanitizeProperties(input: unknown, allowedProperties: readonly string[]): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!allowedProperties.includes(key) || forbiddenKey.test(key)) continue;
      const sanitized = this.sanitizeValue(value);
      if (sanitized !== undefined) safe[key] = sanitized;
    }
    return safe;
  }

  private sanitizeValue(value: unknown): unknown {
    if (value == null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") {
      const trimmed = value.trim().slice(0, 120);
      if (forbiddenValue.test(trimmed)) return undefined;
      return trimmed;
    }
    if (Array.isArray(value)) return value.slice(0, 12).map((item) => this.sanitizeValue(item)).filter((item) => item !== undefined);
    return undefined;
  }
}

export const analyticsDataMinimizationService = new AnalyticsDataMinimizationService();

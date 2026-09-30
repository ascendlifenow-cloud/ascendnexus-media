import { getBackendConfig } from "../../config/backendConfig";
import { observabilityContextService } from "./ObservabilityContextService";

const redactValue = (value: unknown): unknown => {
  if (typeof value === "string") return value.replace(/(authorization|cookie|password|token|secret|signature|email|phone)=?[^,\s&]*/gi, "$1=[REDACTED]").replace(/private\/[^\s"]+/gi, "private/[REDACTED]").replace(/full[-_]?song[^\s"]*/gi, "full-song[REDACTED]").slice(0, 2000);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [/password|token|secret|cookie|authorization|email|phone|message/i.test(key) ? [key, "[REDACTED]"] : [key, redactValue(child)]]));
  return value;
};

export class ProductionLogger {
  child(context: Record<string, unknown>) { return { info: (m: string, c = {}) => this.info(m, { ...context, ...c }), warn: (m: string, c = {}) => this.warn(m, { ...context, ...c }), error: (m: string, c = {}) => this.error(m, { ...context, ...c }) }; }
  debug(message: string, context: Record<string, unknown> = {}) { this.write("debug", message, context); }
  info(message: string, context: Record<string, unknown> = {}) { this.write("info", message, context); }
  warn(message: string, context: Record<string, unknown> = {}) { this.write("warn", message, context); }
  error(message: string, context: Record<string, unknown> = {}) { this.write("error", message, context); }
  fatal(message: string, context: Record<string, unknown> = {}) { this.write("fatal", message, context); }
  flush() { return { flushed: true, checkedAt: new Date().toISOString() }; }
  shutdown() { return this.flush(); }

  private write(level: string, message: string, context: Record<string, unknown>) {
    const config = getBackendConfig();
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: String(message).replace(/[\r\n]/g, " ").slice(0, 500),
      ...observabilityContextService.baseContext(),
      context: redactValue(observabilityContextService.sanitize(context)),
    };
    if (config.logging.format === "json") console.log(JSON.stringify(entry));
    else console.log(`[${entry.timestamp}] ${level.toUpperCase()} ${entry.message}`);
  }
}

export const productionLogger = new ProductionLogger();

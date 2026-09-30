import type { ConfigurationIssue } from "./configTypes";

type IssueSink = ConfigurationIssue[];

const source = "environment" as const;

export const envString = (env: NodeJS.ProcessEnv, key: string, fallback?: string): string | undefined => {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const parseBoolean = (raw: string | undefined, key: string, fallback: boolean, issues: IssueSink): boolean => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = raw.trim().toLowerCase();
  if (["true", "1", "yes"].includes(value)) return true;
  if (["false", "0", "no"].includes(value)) return false;
  issues.push({
    code: "CONFIG_BOOLEAN_INVALID",
    field: key,
    message: `${key} must be one of true, false, 1, 0, yes, no.`,
    severity: "error",
    source,
    sensitive: false,
  });
  return fallback;
};

export const parseInteger = (
  raw: string | undefined,
  key: string,
  fallback: number,
  issues: IssueSink,
  options: { min?: number; max?: number; allowZero?: boolean } = {},
): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number.parseInt(raw.trim(), 10);
  const min = options.min ?? (options.allowZero ? 0 : 1);
  if (!Number.isSafeInteger(value) || value < min || (options.max !== undefined && value > options.max)) {
    issues.push({
      code: "CONFIG_INTEGER_INVALID",
      field: key,
      message: `${key} must be an integer${options.min !== undefined ? ` >= ${options.min}` : ""}${options.max !== undefined ? ` and <= ${options.max}` : ""}.`,
      severity: "error",
      source,
      sensitive: false,
    });
    return fallback;
  }
  return value;
};

export const parseSampleRate = (raw: string | undefined, key: string, fallback: number, issues: IssueSink): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number.parseFloat(raw.trim());
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    issues.push({
      code: "CONFIG_SAMPLE_RATE_INVALID",
      field: key,
      message: `${key} must be a number between 0 and 1.`,
      severity: "error",
      source,
      sensitive: false,
    });
    return fallback;
  }
  return value;
};

export const parseList = (raw: string | undefined): string[] =>
  raw?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

export const parseUrlList = (raw: string | undefined, key: string, issues: IssueSink): string[] =>
  parseList(raw).filter((item) => {
    if (isValidHttpUrl(item)) return true;
    issues.push({
      code: "CONFIG_URL_INVALID",
      field: key,
      message: `${key} contains an invalid URL.`,
      severity: "error",
      source,
      sensitive: false,
    });
    return false;
  });

export const isValidHttpUrl = (value: string | undefined): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const isLocalUrl = (value: string | undefined): boolean => {
  if (!value) return false;
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
};

export const requireHttpsUrl = (value: string | undefined, key: string, issues: IssueSink, options: { allowLocal?: boolean } = {}) => {
  if (!value) return;
  if (!isValidHttpUrl(value)) {
    issues.push({ code: "CONFIG_URL_INVALID", field: key, message: `${key} must be an http(s) URL.`, severity: "error", source, sensitive: false });
    return;
  }
  const url = new URL(value);
  if (url.protocol !== "https:" && !(options.allowLocal && isLocalUrl(value))) {
    issues.push({ code: "CONFIG_URL_REQUIRES_HTTPS", field: key, message: `${key} must use HTTPS in staging/production.`, severity: "error", source, sensitive: false });
  }
};

export const isPlaceholderValue = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return [
    "change-me",
    "changeme",
    "placeholder",
    "example",
    "dev-admin-token",
    "<generate_a_strong_secret>",
    "<backend-only-secret-key>",
    "<secret>",
  ].includes(normalized) || normalized.includes("your-") || normalized.includes("<");
};

export const hasStrongSecret = (value: string | undefined, minLength = 32): boolean => {
  if (!value || value.length < minLength || isPlaceholderValue(value)) return false;
  if (/^(.)\1+$/.test(value)) return false;
  if (/^(abc|123|password|secret|token)/i.test(value)) return false;
  return true;
};

export const looksLikeMongoUri = (value: string | undefined): boolean =>
  Boolean(value && /^mongodb(\+srv)?:\/\//i.test(value));

export const looksLikeRedisUri = (value: string | undefined): boolean =>
  Boolean(value && /^rediss?:\/\//i.test(value));

export const redactUri = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    url.search = "";
    return url.toString();
  } catch {
    return "[REDACTED]";
  }
};

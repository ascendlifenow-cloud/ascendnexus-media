import type { PublicRuntimeConfig, PublicRuntimeConfigValidation } from "./PublicRuntimeConfig";

const environments = new Set(["development", "test", "staging", "production"]);

const isHttpUrlOrRelative = (value: string): boolean => {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const validatePublicRuntimeConfig = (config: unknown): PublicRuntimeConfigValidation => {
  const errors: string[] = [];
  if (!config || typeof config !== "object") return { valid: false, errors: ["Public runtime config must be an object."] };
  const candidate = config as Partial<PublicRuntimeConfig>;
  if (!candidate.environment || !environments.has(candidate.environment)) errors.push("Invalid environment.");
  if (!candidate.appName) errors.push("Missing appName.");
  if (!candidate.appVersion) errors.push("Missing appVersion.");
  if (!candidate.publicApiBaseUrl || !isHttpUrlOrRelative(candidate.publicApiBaseUrl)) errors.push("Invalid publicApiBaseUrl.");
  if (candidate.publicAppBaseUrl && !isHttpUrlOrRelative(candidate.publicAppBaseUrl)) errors.push("Invalid publicAppBaseUrl.");
  if (!candidate.analytics || typeof candidate.analytics !== "object") errors.push("Missing analytics config.");
  if (!candidate.features || typeof candidate.features !== "object") errors.push("Missing feature config.");
  return { valid: errors.length === 0, errors };
};

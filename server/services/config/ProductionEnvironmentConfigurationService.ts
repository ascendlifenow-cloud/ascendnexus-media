import { buildBackendConfig } from "../../config/backendConfig";
import { getConfigurationValidationResult } from "../../config/configValidation";

export type ProductionEnvironmentVariableState = "configured" | "missing" | "invalid" | "optional" | "not_applicable";

export interface ProductionEnvironmentVariableCheck {
  name: string;
  category: string;
  state: ProductionEnvironmentVariableState;
  required: boolean;
  sensitive: boolean;
  summary: string;
}

export interface ProductionEnvironmentConfigurationReport {
  environment: string;
  strictMode: boolean;
  valid: boolean;
  checkedAt: string;
  categories: Record<string, { configured: number; missing: number; invalid: number; optional: number; notApplicable: number }>;
  variables: ProductionEnvironmentVariableCheck[];
  configErrors: Array<{ code: string; field: string; message: string; sensitive: boolean }>;
  configWarnings: Array<{ code: string; field: string; message: string; sensitive: boolean }>;
}

interface VariableSpec {
  name: string;
  category: string;
  requiredWhen: (env: NodeJS.ProcessEnv, productionLike: boolean) => boolean;
  sensitive?: boolean;
}

const hasValue = (env: NodeJS.ProcessEnv, name: string) => Boolean(env[name]?.trim());

const SPECS: VariableSpec[] = [
  { name: "NODE_ENV", category: "Application", requiredWhen: () => false },
  { name: "APP_ENV", category: "Application", requiredWhen: (_env, productionLike) => productionLike },
  { name: "APP_VERSION", category: "Application", requiredWhen: (_env, productionLike) => productionLike },
  { name: "APP_COMMIT_SHA", category: "Application", requiredWhen: (_env, productionLike) => productionLike },
  { name: "PUBLIC_APP_BASE_URL", category: "Domains", requiredWhen: (_env, productionLike) => productionLike },
  { name: "ADMIN_APP_BASE_URL", category: "Domains", requiredWhen: (_env, productionLike) => productionLike },
  { name: "PUBLIC_API_BASE_URL", category: "Domains", requiredWhen: (_env, productionLike) => productionLike },
  { name: "CORS_ALLOWED_ORIGINS", category: "Security", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MONGODB_URI", category: "Database", requiredWhen: (_env, productionLike) => productionLike, sensitive: true },
  { name: "MONGODB_DATABASE", category: "Database", requiredWhen: (_env, productionLike) => productionLike },
  { name: "REDIS_URL", category: "Redis", requiredWhen: (_env, productionLike) => productionLike, sensitive: true },
  { name: "REDIS_TLS_REQUIRED", category: "Redis", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MEDIA_STORAGE_PROVIDER", category: "Storage", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MEDIA_STORAGE_ENDPOINT", category: "Storage", requiredWhen: (env, productionLike) => productionLike && ["s3", "r2"].includes(env.MEDIA_STORAGE_PROVIDER ?? "") },
  { name: "MEDIA_STORAGE_BUCKET", category: "Storage", requiredWhen: (env, productionLike) => productionLike && ["s3", "r2"].includes(env.MEDIA_STORAGE_PROVIDER ?? "") },
  { name: "MEDIA_STORAGE_ACCESS_KEY_ID", category: "Storage", requiredWhen: (env, productionLike) => productionLike && ["s3", "r2"].includes(env.MEDIA_STORAGE_PROVIDER ?? ""), sensitive: true },
  { name: "MEDIA_STORAGE_SECRET_ACCESS_KEY", category: "Storage", requiredWhen: (env, productionLike) => productionLike && ["s3", "r2"].includes(env.MEDIA_STORAGE_PROVIDER ?? ""), sensitive: true },
  { name: "MEDIA_STORAGE_PUBLIC_BASE_URL", category: "Storage", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MEDIA_CDN_ENABLED", category: "CDN", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MEDIA_CDN_BASE_URL", category: "CDN", requiredWhen: (env, productionLike) => productionLike && env.MEDIA_CDN_ENABLED === "true" },
  { name: "EMAIL_ENABLED", category: "Email", requiredWhen: (_env, productionLike) => productionLike },
  { name: "EMAIL_PROVIDER", category: "Email", requiredWhen: (env, productionLike) => productionLike && env.EMAIL_ENABLED === "true" },
  { name: "EMAIL_API_KEY", category: "Email", requiredWhen: (env) => env.EMAIL_ENABLED === "true" && ["sendgrid", "postmark", "resend", "custom"].includes(env.EMAIL_PROVIDER ?? ""), sensitive: true },
  { name: "EMAIL_SMTP_HOST", category: "Email", requiredWhen: (env) => env.EMAIL_ENABLED === "true" && env.EMAIL_PROVIDER === "smtp" },
  { name: "EMAIL_SMTP_USER", category: "Email", requiredWhen: (env) => env.EMAIL_ENABLED === "true" && env.EMAIL_PROVIDER === "smtp", sensitive: true },
  { name: "EMAIL_SMTP_PASSWORD", category: "Email", requiredWhen: (env) => env.EMAIL_ENABLED === "true" && env.EMAIL_PROVIDER === "smtp", sensitive: true },
  { name: "EMAIL_FROM_ADDRESS", category: "Email", requiredWhen: (env, productionLike) => productionLike && env.EMAIL_ENABLED === "true" },
  { name: "AUTH_ENABLED", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike },
  { name: "AUTH_SESSION_SECRET", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike, sensitive: true },
  { name: "AUTH_ACCESS_TOKEN_SECRET", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike, sensitive: true },
  { name: "AUTH_REFRESH_TOKEN_SECRET", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike, sensitive: true },
  { name: "AUTH_COOKIE_NAME", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike },
  { name: "AUTH_COOKIE_DOMAIN", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike },
  { name: "AUTH_COOKIE_SECURE", category: "Authentication", requiredWhen: (_env, productionLike) => productionLike },
  { name: "SECURITY_HELMET_ENABLED", category: "Security", requiredWhen: (_env, productionLike) => productionLike },
  { name: "SECURITY_CSP_ENABLED", category: "Security", requiredWhen: (_env, productionLike) => productionLike },
  { name: "SECURITY_CSRF_ENABLED", category: "Security", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MEDIA_WORKERS_ENABLED", category: "Workers", requiredWhen: (_env, productionLike) => productionLike },
  { name: "FFMPEG_PATH", category: "Media", requiredWhen: (env) => env.MEDIA_AUDIO_METADATA_ENABLED === "true" || env.MEDIA_AUDIO_WAVEFORM_ENABLED === "true" || env.MEDIA_AUDIO_TRANSCODE_ENABLED === "true" },
  { name: "FFPROBE_PATH", category: "Media", requiredWhen: (env) => env.MEDIA_AUDIO_METADATA_ENABLED === "true" || env.MEDIA_AUDIO_WAVEFORM_ENABLED === "true" || env.MEDIA_AUDIO_TRANSCODE_ENABLED === "true" },
  { name: "MEDIA_UPLOAD_MAX_FULL_SONG_BYTES", category: "Media", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MEDIA_INTAKE_ENABLED", category: "Feature Flags", requiredWhen: () => false },
  { name: "FEATURE_ADMIN_ENABLED", category: "Feature Flags", requiredWhen: (_env, productionLike) => productionLike },
  { name: "PUBLIC_API_ENABLED", category: "Feature Flags", requiredWhen: (_env, productionLike) => productionLike },
  { name: "PUBLIC_API_SEED_FALLBACK_ENABLED", category: "Feature Flags", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MONITORING_ENABLED", category: "Observability", requiredWhen: (_env, productionLike) => productionLike },
  { name: "MONITORING_DSN", category: "Observability", requiredWhen: (env) => env.MONITORING_ENABLED === "true", sensitive: true },
  { name: "LOG_FORMAT", category: "Observability", requiredWhen: (_env, productionLike) => productionLike },
  { name: "LOG_REDACT_FIELDS", category: "Observability", requiredWhen: () => false },
  { name: "EXPORT_IMPORT_ENABLED", category: "Export/Import", requiredWhen: () => false },
  { name: "BILLING_ENABLED", category: "Feature Flags", requiredWhen: () => false },
];

const emptyCounts = () => ({ configured: 0, missing: 0, invalid: 0, optional: 0, notApplicable: 0 });

export class ProductionEnvironmentConfigurationService {
  getReport(env: NodeJS.ProcessEnv = process.env): ProductionEnvironmentConfigurationReport {
    const config = buildBackendConfig(env);
    const validation = getConfigurationValidationResult(config);
    const productionLike = config.app.isProduction || config.app.isStaging || config.app.strictMode;
    const invalidFields = new Set(validation.errors.map((issue) => issue.field));
    const variables = SPECS.map((spec): ProductionEnvironmentVariableCheck => {
      const required = spec.requiredWhen(env, productionLike);
      const present = hasValue(env, spec.name);
      const invalid = invalidFields.has(spec.name);
      const state: ProductionEnvironmentVariableState = invalid ? "invalid" : present ? "configured" : required ? "missing" : "optional";
      return {
        name: spec.name,
        category: spec.category,
        state,
        required,
        sensitive: Boolean(spec.sensitive),
        summary: spec.sensitive && present ? "Configured by secret reference or environment; value redacted." : present ? "Configured." : required ? "Required for production cutover." : "Optional or feature-dependent.",
      };
    });
    const categories: ProductionEnvironmentConfigurationReport["categories"] = {};
    for (const variable of variables) {
      categories[variable.category] ??= emptyCounts();
      if (variable.state === "not_applicable") categories[variable.category].notApplicable += 1;
      else if (variable.state === "configured") categories[variable.category].configured += 1;
      else if (variable.state === "missing") categories[variable.category].missing += 1;
      else if (variable.state === "invalid") categories[variable.category].invalid += 1;
      else categories[variable.category].optional += 1;
    }
    return {
      environment: validation.environment,
      strictMode: config.app.strictMode,
      valid: validation.valid,
      checkedAt: validation.checkedAt,
      categories,
      variables,
      configErrors: validation.errors.map((issue) => ({ code: issue.code, field: issue.field, message: issue.message, sensitive: issue.sensitive })),
      configWarnings: validation.warnings.map((issue) => ({ code: issue.code, field: issue.field, message: issue.message, sensitive: issue.sensitive })),
    };
  }
}

export const productionEnvironmentConfigurationService = new ProductionEnvironmentConfigurationService();

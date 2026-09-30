import { buildBackendConfig } from "../server/config/backendConfig";
import { redactObject } from "../server/config/configRedaction";
import { getConfigurationValidationResult } from "../server/config/configValidation";

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const environment = getArg("environment") ?? getArg("env");
const json = args.includes("--json");
const strict = args.includes("--strict");

const env = { ...process.env };
if (environment) env.APP_ENV = environment;
if (strict) env.CONFIG_STRICT_MODE = "true";

try {
  const config = buildBackendConfig(env);
  const validation = getConfigurationValidationResult(config);
  const payload = {
    environment: validation.environment,
    valid: validation.valid,
    strictMode: config.app.strictMode,
    errors: validation.errors.map((issue) => ({ code: issue.code, field: issue.field, message: issue.message, sensitive: issue.sensitive })),
    warnings: validation.warnings.map((issue) => ({ code: issue.code, field: issue.field, message: issue.message, sensitive: issue.sensitive })),
    services: {
      databaseConfigured: Boolean(config.database.uri),
      redisConfigured: Boolean(config.redis.url),
      authEnabled: config.auth.enabled,
      storageProvider: config.storage.provider,
      cdnEnabled: config.cdn.enabled,
      uploadsEnabled: config.uploads.enabled,
      workersEnabled: config.processing.workersEnabled,
      publicationEnabled: config.publication.enabled,
      emailEnabled: config.email.enabled,
      analyticsEnabled: config.analytics.enabled,
      monitoringEnabled: config.monitoring.enabled,
      publicApiEnabled: config.publicDelivery.apiEnabled,
      seedFallbackEnabled: config.publicDelivery.seedFallbackEnabled,
    },
  };
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Environment: ${payload.environment}`);
    console.log(`Valid: ${payload.valid ? "yes" : "no"}`);
    console.log(`Strict mode: ${payload.strictMode ? "yes" : "no"}`);
    console.log(`Services: ${JSON.stringify(payload.services)}`);
    if (payload.errors.length) console.log(`Errors: ${payload.errors.map((issue) => `${issue.code}:${issue.field}`).join(", ")}`);
    if (payload.warnings.length) console.log(`Warnings: ${payload.warnings.map((issue) => `${issue.code}:${issue.field}`).join(", ")}`);
  }
  process.exitCode = validation.valid ? 0 : 1;
} catch (error) {
  const safe = error instanceof Error ? { name: error.name, message: error.message } : { message: "Configuration check failed." };
  console.error(json ? JSON.stringify(redactObject(safe), null, 2) : safe.message);
  process.exitCode = 1;
}

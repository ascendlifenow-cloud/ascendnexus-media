import { mediaBackendConfig, type MediaBackendConfig } from "./mediaBackendConfig";
import { getBackendConfig } from "./backendConfig";
import { hasUnsafePrefix } from "../utils/media/storagePrefixUtils";

export interface ProductionStorageConfigValidation {
  configured: boolean;
  provider: string;
  missingFields: string[];
  warnings: string[];
  errors: string[];
}

const productionProviders = new Set(["r2", "s3"]);

export const validateProductionStorageConfig = (
  config: MediaBackendConfig = mediaBackendConfig,
): ProductionStorageConfigValidation => {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const provider = config.provider;
  const backendConfig = getBackendConfig();
  const productionLike = backendConfig.app.isProduction || backendConfig.app.isStaging;
  if (!["local", "mock", "r2", "s3", "supabase", "firebase"].includes(provider)) {
    errors.push(`Unsupported storage provider "${provider}".`);
  }
  if (productionProviders.has(provider)) {
    if (!config.endpoint) missingFields.push("MEDIA_STORAGE_ENDPOINT");
    if (!config.bucket) missingFields.push("MEDIA_STORAGE_BUCKET");
    if (!config.region) missingFields.push("MEDIA_STORAGE_REGION");
    if (!config.accessKeyId) missingFields.push("MEDIA_STORAGE_ACCESS_KEY_ID");
    if (!config.secretAccessKey) missingFields.push("MEDIA_STORAGE_SECRET_ACCESS_KEY");
    if (!config.publicBaseUrl && !config.cdnBaseUrl) warnings.push("Public uploads require MEDIA_STORAGE_PUBLIC_BASE_URL or MEDIA_CDN_BASE_URL.");
  }
  if (hasUnsafePrefix(config.publicPrefix)) errors.push("MEDIA_STORAGE_PUBLIC_PREFIX is unsafe.");
  if (hasUnsafePrefix(config.privatePrefix)) errors.push("MEDIA_STORAGE_PRIVATE_PREFIX is unsafe.");
  if (config.publicPrefix === config.privatePrefix) {
    errors.push("MEDIA_STORAGE_PUBLIC_PREFIX and MEDIA_STORAGE_PRIVATE_PREFIX must be distinct.");
  }
  if (config.signedUrlExpirationSeconds > config.maxSignedUrlExpirationSeconds) {
    errors.push("MEDIA_SIGNED_URL_EXPIRATION_SECONDS exceeds the maximum allowed expiration.");
  }
  if (provider === "local" || provider === "mock") {
    warnings.push("Development storage provider is active.");
    if (productionLike) {
      errors.push(`Storage provider "${provider}" is not allowed for staging or production.`);
    }
  }
  if (productionLike && config.allowMockFallback) {
    errors.push("MEDIA_STORAGE_ALLOW_PRODUCTION_MOCK_FALLBACK must be false in staging and production.");
  }
  return {
    configured: missingFields.length === 0 && errors.length === 0,
    provider,
    missingFields,
    warnings,
    errors,
  };
};

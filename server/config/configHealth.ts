import type { BackendConfig } from "./backendConfig";
import { getBackendConfig } from "./backendConfig";
import type { ConfigurationHealthReport, ConfigurationHealthServiceEntry, ConfigurationHealthStatus } from "./configTypes";
import { getConfigurationValidationResult } from "./configValidation";

const statusFor = (configured: boolean, required: boolean, hasErrors: boolean): ConfigurationHealthStatus => {
  if (hasErrors) return "misconfigured";
  if (!configured && required) return "unavailable";
  if (!configured) return "disabled";
  return "healthy";
};

const hasIssue = (config: BackendConfig, fields: string[]) =>
  config.issues.some((issue) => fields.includes(issue.field) && issue.severity === "error");

export class ConfigurationHealthService {
  constructor(private readonly config: BackendConfig = getBackendConfig()) {}

  getConfigurationHealth(): ConfigurationHealthReport {
    const services = [
      this.getPublicConfigurationHealth(),
      this.getDatabaseConfigurationHealth(),
      this.getRedisConfigurationHealth(),
      this.getAuthConfigurationHealth(),
      this.getStorageConfigurationHealth(),
      this.getCdnConfigurationHealth(),
      this.getUploadConfigurationHealth(),
      this.getProcessingConfigurationHealth(),
      this.getPublicationConfigurationHealth(),
      this.getEmailConfigurationHealth(),
      this.getAnalyticsConfigurationHealth(),
      this.getSecurityConfigurationHealth(),
      this.getMonitoringConfigurationHealth(),
    ];
    const validation = getConfigurationValidationResult(this.config);
    return {
      environment: this.config.app.environment,
      overallStatus: validation.errors.length ? "misconfigured" : services.some((service) => service.status === "degraded") ? "degraded" : "healthy",
      services,
      issues: this.config.issues,
      checkedAt: new Date().toISOString(),
      metadata: {
        serviceName: this.config.app.serviceName,
        version: this.config.app.version,
        strictMode: this.config.app.strictMode,
      },
    };
  }

  getPublicConfigurationHealth(): ConfigurationHealthServiceEntry {
    const required = this.config.app.isProduction || this.config.app.isStaging;
    const configured = Boolean(this.config.server.publicApiBaseUrl && this.config.server.publicAppBaseUrl);
    return {
      name: "public-runtime",
      status: statusFor(configured, required, hasIssue(this.config, ["PUBLIC_API_BASE_URL", "PUBLIC_APP_BASE_URL", "ADMIN_APP_BASE_URL"])),
      configured,
      required,
      message: configured ? "Public runtime URLs are configured." : "Public runtime URLs are incomplete.",
      safeDetails: {
        publicApiBaseUrlConfigured: Boolean(this.config.server.publicApiBaseUrl),
        publicAppBaseUrlConfigured: Boolean(this.config.server.publicAppBaseUrl),
        adminAppBaseUrlConfigured: Boolean(this.config.server.adminAppBaseUrl),
      },
    };
  }

  getStorageConfigurationHealth(): ConfigurationHealthServiceEntry {
    const required = this.config.uploads.enabled || this.config.publication.enabled;
    const configured = Boolean(this.config.storage.provider && !["mock", "local"].includes(this.config.storage.provider));
    return {
      name: "storage",
      status: statusFor(configured, required && (this.config.app.isProduction || this.config.app.isStaging), hasIssue(this.config, ["MEDIA_STORAGE_PROVIDER", "MEDIA_STORAGE_ENDPOINT", "MEDIA_STORAGE_BUCKET", "MEDIA_STORAGE_ACCESS_KEY_ID", "MEDIA_STORAGE_SECRET_ACCESS_KEY"])),
      configured,
      required,
      message: `Storage provider: ${this.config.storage.provider}.`,
      safeDetails: {
        provider: this.config.storage.provider,
        mockEnabled: this.config.storage.mockEnabled,
        localEnabled: this.config.storage.localEnabled,
        publicBaseUrlConfigured: Boolean(this.config.storage.publicBaseUrl),
      },
    };
  }

  getDatabaseConfigurationHealth(): ConfigurationHealthServiceEntry {
    const required = this.config.app.isProduction || this.config.app.isStaging;
    const configured = Boolean(this.config.database.uri);
    return {
      name: "database",
      status: statusFor(configured, required, hasIssue(this.config, ["MONGODB_URI"])),
      configured,
      required,
      message: configured ? "Database URI is configured." : "Database URI is missing.",
      safeDetails: { uriConfigured: configured, healthCheckEnabled: this.config.database.healthCheckEnabled },
    };
  }

  getRedisConfigurationHealth(): ConfigurationHealthServiceEntry {
    const required = this.config.processing.workersEnabled || this.config.publicDelivery.cacheEnabled || this.config.app.isProduction;
    const configured = Boolean(this.config.redis.url);
    return {
      name: "redis",
      status: statusFor(configured, required, hasIssue(this.config, ["REDIS_URL"])),
      configured,
      required,
      message: configured ? "Redis URL is configured." : "Redis URL is missing.",
      safeDetails: { urlConfigured: configured, prefix: this.config.redis.prefix, tlsRequired: this.config.redis.tlsRequired },
    };
  }

  getAuthConfigurationHealth(): ConfigurationHealthServiceEntry {
    const required = this.config.app.isProduction || this.config.app.isStaging;
    return {
      name: "auth",
      status: statusFor(this.config.auth.enabled, required, hasIssue(this.config, ["AUTH_ENABLED", "MEDIA_AUTH_DISABLED", "MEDIA_ADMIN_DEV_TOKEN", "AUTH_SESSION_SECRET", "AUTH_ACCESS_TOKEN_SECRET", "AUTH_REFRESH_TOKEN_SECRET", "AUTH_COOKIE_SECURE"])),
      configured: this.config.auth.enabled,
      required,
      message: this.config.auth.enabled ? `Auth provider ${this.config.auth.provider} is enabled.` : "Authentication is disabled.",
      safeDetails: {
        provider: this.config.auth.provider,
        cookieSecure: this.config.auth.cookieSecure,
        bootstrapEnabled: this.config.auth.initialAdminBootstrapEnabled,
      },
    };
  }

  getEmailConfigurationHealth(): ConfigurationHealthServiceEntry {
    return {
      name: "email",
      status: statusFor(this.config.email.enabled, this.config.features.contactEnabled && this.config.app.isProduction, hasIssue(this.config, ["EMAIL_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM_ADDRESS", "EMAIL_SMTP_HOST", "EMAIL_ENABLED"])),
      configured: this.config.email.enabled,
      required: this.config.features.contactEnabled && this.config.app.isProduction,
      message: this.config.email.enabled ? `Email provider ${this.config.email.provider} is enabled.` : "Email is disabled.",
      safeDetails: {
        provider: this.config.email.provider,
        recipientsConfigured: this.config.email.contactNotificationRecipients.length > 0,
        newsletterEnabled: this.config.email.newsletterEnabled,
      },
    };
  }

  getProcessingConfigurationHealth(): ConfigurationHealthServiceEntry {
    const configured = this.config.processing.workersEnabled;
    const required = this.config.app.isProduction || this.config.publication.enabled;
    return {
      name: "processing",
      status: statusFor(configured, required && this.config.app.isProduction, hasIssue(this.config, ["MEDIA_WORKERS_ENABLED", "FFMPEG_PATH"])),
      configured,
      required,
      message: configured ? "Processing workers are enabled." : "Processing workers are disabled.",
      safeDetails: {
        imageProcessingEnabled: this.config.processing.imageProcessingEnabled,
        audioMetadataEnabled: this.config.processing.audioMetadataEnabled,
        waveformEnabled: this.config.processing.waveformEnabled,
        transcodingEnabled: this.config.processing.transcodingEnabled,
      },
    };
  }

  getPublicationConfigurationHealth(): ConfigurationHealthServiceEntry {
    return {
      name: "publication",
      status: statusFor(this.config.publication.enabled, this.config.app.isProduction, hasIssue(this.config, ["MEDIA_PUBLICATION_ENABLED"])),
      configured: this.config.publication.enabled,
      required: this.config.app.isProduction,
      message: this.config.publication.enabled ? "Publication pipeline is enabled." : "Publication pipeline is disabled.",
      safeDetails: {
        syncVerification: this.config.publication.runSyncVerification,
        preservePreviousPublicVersion: this.config.publication.preservePreviousPublicVersion,
      },
    };
  }

  getSecurityConfigurationHealth(): ConfigurationHealthServiceEntry {
    const configured = this.config.security.helmetEnabled && this.config.security.rateLimitEnabled && !this.config.security.errorDetailsEnabled;
    return {
      name: "security",
      status: statusFor(configured, this.config.app.isProduction, hasIssue(this.config, ["SECURITY_HELMET_ENABLED", "SECURITY_ERROR_DETAILS_ENABLED"])),
      configured,
      required: this.config.app.isProduction,
      message: configured ? "Security controls are configured." : "Security controls are incomplete.",
      safeDetails: {
        helmetEnabled: this.config.security.helmetEnabled,
        cspEnabled: this.config.security.contentSecurityPolicyEnabled,
        rateLimitEnabled: this.config.security.rateLimitEnabled,
        csrfEnabled: this.config.security.csrfEnabled,
      },
    };
  }

  getCdnConfigurationHealth(): ConfigurationHealthServiceEntry {
    return {
      name: "cdn",
      status: this.config.cdn.enabled ? statusFor(Boolean(this.config.cdn.baseUrl), false, hasIssue(this.config, ["MEDIA_CDN_BASE_URL"])) : "disabled",
      configured: this.config.cdn.enabled && Boolean(this.config.cdn.baseUrl),
      required: false,
      message: this.config.cdn.enabled ? "CDN is enabled." : "CDN is disabled.",
      safeDetails: { provider: this.config.cdn.provider, baseUrlConfigured: Boolean(this.config.cdn.baseUrl), invalidationEnabled: this.config.cdn.invalidationEnabled },
    };
  }

  getUploadConfigurationHealth(): ConfigurationHealthServiceEntry {
    return {
      name: "uploads",
      status: this.config.uploads.enabled ? "healthy" : "disabled",
      configured: this.config.uploads.enabled,
      required: this.config.features.adminEnabled,
      message: this.config.uploads.enabled ? "Uploads are enabled." : "Uploads are disabled.",
      safeDetails: { apiMode: this.config.uploads.apiMode, directUploadEnabled: this.config.uploads.directUploadEnabled, virusScanEnabled: this.config.uploads.virusScanEnabled },
    };
  }

  getAnalyticsConfigurationHealth(): ConfigurationHealthServiceEntry {
    return {
      name: "analytics",
      status: this.config.analytics.enabled ? statusFor(Boolean(this.config.analytics.publicMeasurementId), false, hasIssue(this.config, ["ANALYTICS_PROVIDER", "ANALYTICS_PUBLIC_MEASUREMENT_ID"])) : "disabled",
      configured: this.config.analytics.enabled,
      required: false,
      message: this.config.analytics.enabled ? `Analytics provider ${this.config.analytics.provider} is enabled.` : "Analytics is disabled.",
      safeDetails: { provider: this.config.analytics.provider, publicMeasurementIdConfigured: Boolean(this.config.analytics.publicMeasurementId) },
    };
  }

  getMonitoringConfigurationHealth(): ConfigurationHealthServiceEntry {
    return {
      name: "monitoring",
      status: this.config.monitoring.enabled ? "healthy" : "disabled",
      configured: this.config.monitoring.enabled,
      required: this.config.app.isProduction,
      message: this.config.monitoring.enabled ? `Monitoring provider ${this.config.monitoring.provider} is enabled.` : "Monitoring is disabled.",
      safeDetails: { provider: this.config.monitoring.provider, dsnConfigured: Boolean(this.config.monitoring.dsn) },
    };
  }
}

export const configurationHealthService = new ConfigurationHealthService();

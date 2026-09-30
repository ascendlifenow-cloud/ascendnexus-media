import type { DeploymentEnvironment } from "./environment";

export type ConfigurationIssueSeverity = "error" | "warning" | "info";
export type ConfigurationHealthStatus = "healthy" | "degraded" | "unavailable" | "misconfigured" | "disabled" | "unknown";

export interface ConfigurationIssue {
  code: string;
  field: string;
  message: string;
  severity: ConfigurationIssueSeverity;
  source: "environment" | "default" | "derived" | "runtime";
  sensitive: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  environment: DeploymentEnvironment;
  errors: ConfigurationIssue[];
  warnings: ConfigurationIssue[];
  info: ConfigurationIssue[];
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export class ConfigurationError extends Error {
  readonly code: string;
  readonly issues: ConfigurationIssue[];
  readonly environment: DeploymentEnvironment;
  readonly exitCode: number;
  readonly metadata?: Record<string, string | number | boolean | null>;

  constructor(input: {
    code: string;
    message: string;
    issues: ConfigurationIssue[];
    environment: DeploymentEnvironment;
    exitCode?: number;
    metadata?: Record<string, string | number | boolean | null>;
  }) {
    super(input.message);
    this.name = "ConfigurationError";
    this.code = input.code;
    this.issues = input.issues;
    this.environment = input.environment;
    this.exitCode = input.exitCode ?? 78;
    this.metadata = input.metadata;
  }
}

export interface ConfigurationHealthServiceEntry {
  name: string;
  status: ConfigurationHealthStatus;
  configured: boolean;
  required: boolean;
  message: string;
  safeDetails?: Record<string, string | number | boolean | null>;
}

export interface ConfigurationHealthReport {
  environment: DeploymentEnvironment;
  overallStatus: ConfigurationHealthStatus;
  services: ConfigurationHealthServiceEntry[];
  issues: ConfigurationIssue[];
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublicRuntimeConfig {
  environment: DeploymentEnvironment;
  appName: string;
  appVersion: string;
  publicApiBaseUrl: string;
  publicAppBaseUrl: string;
  adminAppBaseUrl?: string;
  cdnBaseUrl?: string;
  analytics: {
    enabled: boolean;
    provider: string;
    publicMeasurementId?: string;
    trackPageViews: boolean;
    trackAudioPreview: boolean;
    trackSearch: boolean;
    trackExternalLinks: boolean;
    consentRequired: boolean;
    debug: boolean;
  };
  features: {
    publicSearchEnabled: boolean;
    publicGalleryEnabled: boolean;
    contactEnabled: boolean;
    newsletterEnabled: boolean;
    analyticsEnabled: boolean;
  };
  supportContact?: string;
  build: {
    commitSha?: string;
    buildTimestamp?: string;
  };
  metadata?: Record<string, string | number | boolean | null>;
}

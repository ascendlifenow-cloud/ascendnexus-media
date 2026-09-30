export type DeploymentEnvironment = "development" | "test" | "staging" | "production";

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

export interface PublicRuntimeConfigValidation {
  valid: boolean;
  errors: string[];
}

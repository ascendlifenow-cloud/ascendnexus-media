import type { PublicRuntimeConfig, PublicRuntimeConfigValidation } from "../../config/PublicRuntimeConfig";
import { validatePublicRuntimeConfig } from "../../config/PublicRuntimeConfigSchema";

interface PublicApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

const envValue = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const fallbackConfig = (): PublicRuntimeConfig => ({
  environment: import.meta.env.MODE === "production" ? "production" : "development",
  appName: envValue("VITE_APP_NAME") ?? "Ascend Nexus Media",
  appVersion: envValue("VITE_APP_VERSION") ?? "0.1.0",
  publicApiBaseUrl: envValue("VITE_PUBLIC_API_BASE_URL") ?? "/api/public",
  publicAppBaseUrl: envValue("VITE_PUBLIC_SITE_URL") ?? "",
  adminAppBaseUrl: envValue("VITE_ADMIN_APP_BASE_URL"),
  cdnBaseUrl: envValue("VITE_MEDIA_CDN_BASE_URL"),
  analytics: {
    enabled: envValue("VITE_ANALYTICS_ENABLED") === "true",
    provider: envValue("VITE_ANALYTICS_PROVIDER") ?? "none",
    publicMeasurementId: envValue("VITE_ANALYTICS_PUBLIC_MEASUREMENT_ID"),
    trackPageViews: true,
    trackAudioPreview: true,
    trackSearch: true,
    trackExternalLinks: true,
    consentRequired: true,
    debug: import.meta.env.DEV,
  },
  features: {
    publicSearchEnabled: true,
    publicGalleryEnabled: true,
    contactEnabled: true,
    newsletterEnabled: false,
    analyticsEnabled: envValue("VITE_ANALYTICS_ENABLED") === "true",
  },
  build: {
    commitSha: envValue("VITE_APP_COMMIT_SHA"),
    buildTimestamp: envValue("VITE_APP_BUILD_TIMESTAMP"),
  },
});

export class PublicRuntimeConfigService {
  private config: PublicRuntimeConfig | null = null;
  private validation: PublicRuntimeConfigValidation | null = null;

  async load(injected?: PublicRuntimeConfig): Promise<PublicRuntimeConfig> {
    const config = injected ?? await this.loadFromEndpoint();
    const validation = this.validate(config);
    if (!validation.valid) throw new Error(`Public runtime config is invalid: ${validation.errors.join(" ")}`);
    this.config = Object.freeze(config);
    this.validation = validation;
    return this.config;
  }

  get(): PublicRuntimeConfig {
    if (!this.config) {
      const config = fallbackConfig();
      const validation = this.validate(config);
      if (!validation.valid) throw new Error(`Public runtime config is invalid: ${validation.errors.join(" ")}`);
      this.config = Object.freeze(config);
      this.validation = validation;
    }
    return this.config;
  }

  isLoaded(): boolean {
    return Boolean(this.config);
  }

  validate(config: unknown): PublicRuntimeConfigValidation {
    return validatePublicRuntimeConfig(config);
  }

  getFeatureFlag(name: keyof PublicRuntimeConfig["features"]): boolean {
    return Boolean(this.get().features[name]);
  }

  getApiBaseUrl(): string {
    return this.get().publicApiBaseUrl.replace(/\/+$/, "");
  }

  getEnvironment(): PublicRuntimeConfig["environment"] {
    return this.get().environment;
  }

  getValidation(): PublicRuntimeConfigValidation | null {
    return this.validation;
  }

  private async loadFromEndpoint(): Promise<PublicRuntimeConfig> {
    const configUrl = envValue("VITE_PUBLIC_CONFIG_URL");
    if (!configUrl) return fallbackConfig();
    const response = await fetch(configUrl);
    if (!response.ok) throw new Error(`Public runtime config request failed: ${response.status}`);
    const payload = await response.json() as PublicApiResponse<PublicRuntimeConfig> | PublicRuntimeConfig;
    return "success" in payload ? payload.data : payload;
  }
}

export const publicRuntimeConfigService = new PublicRuntimeConfigService();

import type { PublicAnalyticsMetadata } from "./PublicAnalyticsEvent";

export type AnalyticsProvider = "none" | "console" | "custom" | "future_provider";

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  provider: AnalyticsProvider;
  trackPageViews: boolean;
  trackClicks: boolean;
  trackAudioPreview: boolean;
  trackSearch: boolean;
  trackBrowse: boolean;
  trackGallery: boolean;
  consentRequired: boolean;
  metadata?: PublicAnalyticsMetadata;
}

import type { AnalyticsConfig } from "../analytics";
import type { ArtistExternalLinks } from "../artist";
import type { SeoMetadata, SiteSeoDefaults } from "../seo";
import type { PublicSiteNavigationLink, PublicSiteThemeConfig } from "./PublicSiteConfig";

export type AdminSettingStatus = "configured" | "missing" | "not_required" | "unknown";

export interface AdminSettingsCheck {
  label: string;
  status: AdminSettingStatus;
  description?: string;
}

export interface AdminSettingsAsset {
  label: string;
  url?: string;
  status: AdminSettingStatus;
}

export interface AdminSettingsViewModel {
  siteIdentity: {
    siteName?: string;
    siteDescription?: string;
    publicBaseUrlStatus: AdminSettingStatus;
    seoDefaults?: SiteSeoDefaults | SeoMetadata;
  };
  brandAssets: AdminSettingsAsset[];
  navigation: PublicSiteNavigationLink[];
  footer: PublicSiteNavigationLink[];
  socialContact: {
    socialLinks: ArtistExternalLinks;
    contactEmail?: string;
    contactCtaText?: string;
    newsletterEnabled: boolean;
    contactPageEnabled: boolean;
  };
  analytics: AnalyticsConfig;
  theme: {
    name: string;
    darkModeDefault: boolean;
    artistThemeReady: AdminSettingStatus;
    overrideStatus: AdminSettingStatus;
    config?: PublicSiteThemeConfig;
  };
  deploymentReadiness: AdminSettingsCheck[];
  missingFields: string[];
  warnings: string[];
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

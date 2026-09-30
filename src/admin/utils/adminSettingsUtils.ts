import type { AnalyticsConfig } from "../../models/analytics";
import type { ArtistExternalLinks } from "../../models/artist";
import type {
  AdminSettingStatus,
  AdminSettingsCheck,
  AdminSettingsViewModel,
  PublicSiteConfig,
  PublicSiteNavigationLink,
} from "../../models/admin";
import { defaultAnalyticsConfig } from "../../utils/analytics/analyticsUtils";
import { siteSeoDefaults } from "../../utils/siteSeoDefaults";

const safePublicUrl = (value?: string): boolean => {
  const url = value?.trim();
  if (!url) return false;
  if (/^javascript:/i.test(url)) return false;
  return url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/");
};

const hasText = (value?: string): boolean => Boolean(value?.trim());

export const formatSettingsStatus = (status: AdminSettingStatus): string => {
  if (status === "configured") return "Configured";
  if (status === "missing") return "Missing";
  if (status === "not_required") return "Not Required";
  return "Unknown";
};

const configuredStatus = (value?: string): AdminSettingStatus => (hasText(value) ? "configured" : "missing");

export const validateNavigationLinks = (links: readonly PublicSiteNavigationLink[] = []): string[] => {
  const warnings: string[] = [];
  if (!links.length) warnings.push("Navigation links are empty.");
  links.forEach((link) => {
    if (!hasText(link.label)) warnings.push("Navigation link is missing a label.");
    if (!hasText(link.href)) warnings.push(`Navigation link ${link.label || "unknown"} is missing an href.`);
  });
  return warnings;
};

export const validateFooterLinks = (links: readonly PublicSiteNavigationLink[] = []): string[] => {
  const warnings: string[] = [];
  if (!links.length) warnings.push("Footer links are empty.");
  links.forEach((link) => {
    if (!hasText(link.label)) warnings.push("Footer link is missing a label.");
    if (!hasText(link.href)) warnings.push(`Footer link ${link.label || "unknown"} is missing an href.`);
  });
  return warnings;
};

export const validateSocialContactSettings = (
  socialLinks: ArtistExternalLinks = {},
  contactEmail?: string,
  contactCtaText?: string,
): string[] => {
  const warnings: string[] = [];
  if (!Object.values(socialLinks).some(hasText)) warnings.push("No social links are configured.");
  Object.entries(socialLinks).forEach(([platform, url]) => {
    if (url && !safePublicUrl(url)) warnings.push(`${platform} link appears invalid.`);
  });
  if (!hasText(contactEmail)) warnings.push("Contact email is missing.");
  if (!hasText(contactCtaText)) warnings.push("Contact CTA text is missing.");
  return warnings;
};

export const validateBrandAssets = (config: PublicSiteConfig | undefined): string[] => {
  const warnings: string[] = [];
  if (!safePublicUrl(config?.brandLogoUrl)) warnings.push("Brand logo is not configured.");
  if (!safePublicUrl(config?.defaultCoverArtUrl)) warnings.push("Default cover art is not configured.");
  if (!safePublicUrl(config?.defaultArtistImageUrl)) warnings.push("Default artist image is not configured.");
  if (!safePublicUrl(config?.defaultSocialImageUrl)) warnings.push("Default social image is not configured.");
  return warnings;
};

export const validateAnalyticsSettings = (analytics: AnalyticsConfig = defaultAnalyticsConfig): string[] => {
  const warnings: string[] = [];
  if (!analytics.enabled) warnings.push("Analytics is disabled.");
  if (analytics.enabled && analytics.provider === "none") warnings.push("Analytics is enabled without a provider.");
  return warnings;
};

export const validatePublicSiteConfig = (config: PublicSiteConfig | undefined): string[] => {
  if (!config) return ["Site config is missing."];
  const warnings: string[] = [];
  if (!hasText(config.siteName)) warnings.push("Site name is missing.");
  if (!hasText(config.siteDescription)) warnings.push("Site description is missing.");
  if (!config.seoDefaults) warnings.push("SEO defaults are missing.");
  warnings.push(...validateNavigationLinks(config.navigationLinks));
  warnings.push(...validateFooterLinks(config.footerLinks));
  warnings.push(...validateSocialContactSettings(config.socialLinks, config.contactEmail, config.contactCtaText));
  warnings.push(...validateBrandAssets(config));
  return warnings;
};

export const getSettingsMissingFields = (config: PublicSiteConfig | undefined, analytics = defaultAnalyticsConfig): string[] => {
  const missing: string[] = [];
  if (!hasText(config?.siteName)) missing.push("siteName");
  if (!hasText(config?.siteDescription)) missing.push("siteDescription");
  if (!safePublicUrl(config?.brandLogoUrl)) missing.push("brandLogoUrl");
  if (!safePublicUrl(config?.defaultCoverArtUrl)) missing.push("defaultCoverArtUrl");
  if (!safePublicUrl(config?.defaultArtistImageUrl)) missing.push("defaultArtistImageUrl");
  if (!safePublicUrl(config?.defaultSocialImageUrl)) missing.push("defaultSocialImageUrl");
  if (!Object.values(config?.socialLinks ?? {}).some(hasText)) missing.push("socialLinks");
  if (!hasText(config?.contactEmail)) missing.push("contactEmail");
  if (!config?.seoDefaults) missing.push("seoDefaults");
  if (!analytics) missing.push("analyticsConfig");
  return missing;
};

export const getDeploymentReadinessChecks = (
  config: PublicSiteConfig | undefined,
  analytics: AnalyticsConfig = defaultAnalyticsConfig,
): AdminSettingsCheck[] => [
  {
    label: "Public site URL",
    status: import.meta.env.VITE_PUBLIC_SITE_URL ? "configured" : "missing",
    description: "Only configured/missing state is shown.",
  },
  {
    label: "Metadata base URL",
    status: siteSeoDefaults.basePath || import.meta.env.VITE_PUBLIC_SITE_URL ? "configured" : "missing",
  },
  {
    label: "Analytics provider",
    status: analytics.provider !== "none" ? "configured" : "missing",
  },
  {
    label: "Fallback images",
    status: safePublicUrl(config?.defaultCoverArtUrl) || safePublicUrl(config?.defaultSocialImageUrl) ? "configured" : "missing",
  },
  {
    label: "Contact links",
    status: hasText(config?.contactEmail) || Object.values(config?.socialLinks ?? {}).some(hasText) ? "configured" : "missing",
  },
  {
    label: "Admin auth",
    status: "unknown",
    description: "Auth integration is planned for a future admin phase.",
  },
  {
    label: "API base URL",
    status: import.meta.env.VITE_API_URL ? "configured" : "unknown",
  },
];

export const buildAdminSettingsViewModel = (
  config: PublicSiteConfig | undefined,
  analytics: AnalyticsConfig = defaultAnalyticsConfig,
): AdminSettingsViewModel => {
  const missingFields = getSettingsMissingFields(config, analytics);
  const warnings = [...validatePublicSiteConfig(config), ...validateAnalyticsSettings(analytics)];

  return {
    siteIdentity: {
      siteName: config?.siteName,
      siteDescription: config?.siteDescription,
      publicBaseUrlStatus: import.meta.env.VITE_PUBLIC_SITE_URL ? "configured" : "missing",
      seoDefaults: config?.seoDefaults ?? siteSeoDefaults,
    },
    brandAssets: [
      { label: "Brand Logo", url: config?.brandLogoUrl, status: configuredStatus(config?.brandLogoUrl) },
      { label: "Default Cover Art", url: config?.defaultCoverArtUrl, status: configuredStatus(config?.defaultCoverArtUrl) },
      { label: "Default Artist Image", url: config?.defaultArtistImageUrl, status: configuredStatus(config?.defaultArtistImageUrl) },
      { label: "Default Social Image", url: config?.defaultSocialImageUrl, status: configuredStatus(config?.defaultSocialImageUrl) },
    ],
    navigation: [...(config?.navigationLinks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    footer: [...(config?.footerLinks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    socialContact: {
      socialLinks: config?.socialLinks ?? {},
      contactEmail: config?.contactEmail,
      contactCtaText: config?.contactCtaText,
      newsletterEnabled: Boolean(config?.newsletterEnabled),
      contactPageEnabled: Boolean(config?.contactPageEnabled),
    },
    analytics,
    theme: {
      name: config?.themeConfig?.logoVariant ?? "Ascend Nexus Default",
      darkModeDefault: true,
      artistThemeReady: "not_required",
      overrideStatus: config?.themeConfig ? "configured" : "missing",
      config: config?.themeConfig,
    },
    deploymentReadiness: getDeploymentReadinessChecks(config, analytics),
    missingFields,
    warnings,
    updatedAt: config?.updatedAt,
    metadata: config?.metadata,
  };
};

export const getAdminSettingsStats = (viewModel: AdminSettingsViewModel) => ({
  siteName: viewModel.siteIdentity.siteName || "Missing",
  brandAssets: viewModel.brandAssets.filter((asset) => asset.status === "configured").length,
  navigationLinks: viewModel.navigation.length,
  footerLinks: viewModel.footer.length,
  socialLinks: Object.values(viewModel.socialContact.socialLinks).filter(hasText).length,
  analyticsStatus: viewModel.analytics.enabled ? "Enabled" : "Disabled",
  themeStatus: viewModel.theme.overrideStatus === "configured" ? "Configured" : "Default",
  missingRequired: viewModel.missingFields.length,
});

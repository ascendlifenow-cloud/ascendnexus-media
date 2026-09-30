import type { SiteConfigurationRecord } from "../../models/site/SiteConfigurationModel";
import { homepageRepository } from "../../repositories/HomepageRepository";
import { siteConfigRepository } from "../../repositories/SiteConfigRepository";
import { defaultPublicSiteConfig } from "../../services/site/siteConfigDefaults";
import { recordsToPublicSiteConfig } from "../../services/site/siteConfigMapping";
import { publicFormHealthService } from "../../services/forms/PublicFormHealthService";

export interface PublicSiteConfiguration {
  siteName: string;
  siteDescription: string;
  brandLogoUrl?: string;
  defaultCoverArtUrl?: string;
  defaultArtistImageUrl?: string;
  defaultSocialImageUrl?: string;
  navigation: Array<{ label: string; href: string }>;
  footer: Record<string, unknown>;
  socialLinks: Record<string, string>;
  contactSettings: Record<string, string>;
  theme: Record<string, string>;
  analyticsPublicConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const toPublic = async (record?: SiteConfigurationRecord | null): Promise<PublicSiteConfiguration> => {
  const site = record ?? await siteConfigRepository.getPublished();
  if (!site) {
    const fallback = defaultPublicSiteConfig();
    const contactAvailability = publicFormHealthService.getPublicContactAvailability();
    const newsletterAvailability = publicFormHealthService.getPublicNewsletterAvailability();
    return {
      siteName: fallback.siteName,
      siteDescription: fallback.siteDescription,
      navigation: fallback.navigationLinks.filter((link) => link.enabled).map((link) => ({ label: link.label, href: link.href })),
      footer: { links: fallback.footerLinks.filter((link) => link.enabled), copyright: fallback.siteName },
      socialLinks: {},
      contactSettings: {
        contactFormEnabled: String(contactAvailability.enabled),
        contactFormOperational: String(contactAvailability.operational),
        newsletterEnabled: String(newsletterAvailability.enabled),
        newsletterOperational: String(newsletterAvailability.operational),
        newsletterOptInMode: newsletterAvailability.newsletterOptInMode,
      },
      theme: { mode: "dark" },
      metadata: { delivery: "default-safe" },
    };
  }
  const config = recordsToPublicSiteConfig(site, await homepageRepository.getPublished());
  const contactAvailability = publicFormHealthService.getPublicContactAvailability();
  const newsletterAvailability = publicFormHealthService.getPublicNewsletterAvailability();
  return {
    siteName: config.siteName,
    siteDescription: config.siteDescription,
    brandLogoUrl: config.brandLogoUrl,
    defaultCoverArtUrl: config.defaultCoverArtUrl,
    defaultArtistImageUrl: config.defaultArtistImageUrl,
    defaultSocialImageUrl: config.defaultSocialImageUrl,
    navigation: config.navigationLinks.filter((link) => link.enabled).map((link) => ({ label: link.label, href: link.href })),
    footer: { links: config.footerLinks.filter((link) => link.enabled), copyright: config.siteName },
    socialLinks: config.socialLinks,
    contactSettings: {
      ...(config.contactEmail ? { publicEmail: config.contactEmail } : {}),
      ...(config.contactCtaText ? { contactCtaText: config.contactCtaText } : {}),
      contactPageEnabled: String(config.contactPageEnabled !== false),
      newsletterEnabled: String(config.newsletterEnabled === true),
      contactFormEnabled: String(contactAvailability.enabled),
      contactFormOperational: String(contactAvailability.operational),
      newsletterOperational: String(newsletterAvailability.operational),
      newsletterOptInMode: newsletterAvailability.newsletterOptInMode,
      challengeEnabled: "false",
    },
    theme: Object.fromEntries(Object.entries(config.themeConfig ?? {}).map(([key, value]) => [key, String(value)])),
    analyticsPublicConfig: {},
    metadata: { ...(config.metadata ?? {}), delivery: "public-safe" },
  };
};

export const mapSiteConfigToPublicSiteConfiguration = toPublic;

import type { PublicSiteConfig, PublicSiteConfigSection } from "../../../src/models/admin";
import type { HomepageConfigurationRecord } from "../../models/site/HomepageConfigurationModel";
import type { SiteConfigurationRecord } from "../../models/site/SiteConfigurationModel";

const safeUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (value.includes("private") || value.includes("signed") || value.includes("token=") || value.startsWith("blob:")) return undefined;
  return value;
};

const safeLinks = (links: Array<Record<string, unknown>> = []) =>
  links
    .filter((link) => link.enabled !== false)
    .map((link) => ({
      label: String(link.label ?? "").trim(),
      href: String(link.href ?? link.url ?? "").trim(),
      enabled: true,
      sortOrder: Number(link.sortOrder ?? 100),
      external: Boolean(link.external ?? (typeof link.href === "string" && /^https:\/\//.test(link.href))),
    }))
    .filter((link) => link.label && link.href && (link.href.startsWith("/") || link.href.startsWith("https://")))
    .sort((a, b) => a.sortOrder - b.sortOrder);

const toSections = (sections: Array<Record<string, unknown>> = []): PublicSiteConfigSection[] =>
  sections
    .filter((section) => typeof section.sectionId === "string" && typeof section.sectionType === "string")
    .map((section) => ({
      sectionId: String(section.sectionId),
      sectionType: section.sectionType as PublicSiteConfigSection["sectionType"],
      enabled: section.enabled !== false,
      sortOrder: Number(section.sortOrder ?? 100),
      title: typeof section.title === "string" ? section.title : undefined,
      subtitle: typeof section.subtitle === "string" ? section.subtitle : undefined,
      configuration: typeof section.configuration === "object" && section.configuration && !Array.isArray(section.configuration)
        ? section.configuration as PublicSiteConfigSection["configuration"]
        : {},
      metadata: typeof section.metadata === "object" && section.metadata && !Array.isArray(section.metadata)
        ? section.metadata as PublicSiteConfigSection["metadata"]
        : undefined,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.sectionId.localeCompare(b.sectionId));

export const mapPublicSiteConfigToRecords = (config: PublicSiteConfig, version: number, actorId?: string) => {
  const now = new Date().toISOString();
  const homepage: HomepageConfigurationRecord = {
    homepageConfigId: `homepage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    version,
    status: "draft",
    publicationState: "draft",
    publicVisibility: "not_public",
    sections: config.homepageSections as unknown as Array<Record<string, unknown>>,
    hero: config.homepageSections.find((section) => section.sectionType === "hero") as unknown as Record<string, unknown> | undefined,
    featuredReleaseIds: [],
    artistSpotlightIds: [],
    galleryItemIds: [],
    about: config.homepageSections.find((section) => section.sectionType === "about") as unknown as Record<string, unknown> | undefined,
    cta: config.homepageSections.find((section) => section.sectionType === "explore_artists_cta") as unknown as Record<string, unknown> | undefined,
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: now,
    updatedAt: now,
    metadata: { source: "admin_site_config" },
    schemaVersion: 1,
  };
  const site: SiteConfigurationRecord = {
    siteConfigId: `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    version,
    status: "draft",
    publicationState: "draft",
    publicVisibility: "not_public",
    siteName: config.siteName,
    siteDescription: config.siteDescription,
    brandLogoUrl: config.brandLogoUrl,
    defaultCoverArtUrl: config.defaultCoverArtUrl,
    defaultArtistImageUrl: config.defaultArtistImageUrl,
    defaultSocialImageUrl: config.defaultSocialImageUrl,
    navigation: config.navigationLinks as unknown as Array<Record<string, unknown>>,
    footer: { links: config.footerLinks },
    socialLinks: config.socialLinks as Record<string, string>,
    contactSettings: {
      publicEmail: config.contactEmail,
      contactCtaText: config.contactCtaText,
      newsletterEnabled: config.newsletterEnabled,
      contactPageEnabled: config.contactPageEnabled,
    },
    theme: config.themeConfig ?? {},
    analyticsPublicConfig: {},
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: now,
    updatedAt: now,
    metadata: { seoDefaults: config.seoDefaults },
    schemaVersion: 1,
  };
  return { homepage, site };
};

export const recordsToPublicSiteConfig = (site: SiteConfigurationRecord, homepage: HomepageConfigurationRecord | null): PublicSiteConfig => ({
  siteName: site.siteName,
  siteDescription: site.siteDescription,
  brandLogoUrl: safeUrl(site.brandLogoUrl),
  defaultCoverArtUrl: safeUrl(site.defaultCoverArtUrl),
  defaultArtistImageUrl: safeUrl(site.defaultArtistImageUrl),
  defaultSocialImageUrl: safeUrl(site.defaultSocialImageUrl),
  homepageSections: toSections(homepage?.sections ?? []).filter((section) => section.enabled),
  navigationLinks: safeLinks(site.navigation),
  footerLinks: safeLinks(Array.isArray(site.footer?.links) ? site.footer.links as Array<Record<string, unknown>> : []),
  socialLinks: Object.fromEntries(Object.entries(site.socialLinks ?? {}).filter(([, value]) => typeof value === "string" && value.startsWith("https://"))),
  seoDefaults: (site.metadata?.seoDefaults as PublicSiteConfig["seoDefaults"]) ?? {
    siteName: site.siteName,
    defaultTitle: `${site.siteName} | AI Persona Artists & Original Music`,
    defaultDescription: site.siteDescription,
    basePath: "",
  },
  contactEmail: typeof site.contactSettings?.publicEmail === "string" ? site.contactSettings.publicEmail : undefined,
  contactCtaText: typeof site.contactSettings?.contactCtaText === "string" ? site.contactSettings.contactCtaText : undefined,
  newsletterEnabled: site.contactSettings?.newsletterEnabled === true,
  contactPageEnabled: site.contactSettings?.contactPageEnabled !== false,
  themeConfig: site.theme as PublicSiteConfig["themeConfig"],
  updatedAt: site.updatedAt,
  metadata: {
    siteConfigId: site.siteConfigId,
    homepageConfigId: homepage?.homepageConfigId ?? null,
    siteVersion: site.version,
    homepageVersion: homepage?.version ?? null,
  },
});

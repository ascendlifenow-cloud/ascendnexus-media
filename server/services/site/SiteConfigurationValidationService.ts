import type { PublicSiteConfig, PublicSiteConfigSection, PublicSiteNavigationLink } from "../../../src/models/admin";
import { homepageSectionRegistry } from "./HomepageSectionRegistry";

const supportedInternalRoutes = new Set(["/", "/artists", "/songs", "/releases", "/gallery", "/about", "/contact", "/search", "/browse", "/privacy", "/terms"]);

const isPrivateUrl = (value: unknown): boolean =>
  typeof value === "string" && (value.includes("private") || value.includes("signed") || value.includes("token=") || value.startsWith("blob:") || value.startsWith("data:"));

const isValidHref = (href: string | undefined, external = false): boolean => {
  if (!href) return false;
  if (/^javascript:/i.test(href) || href.includes("..")) return false;
  if (external || href.startsWith("https://")) return href.startsWith("https://");
  return href.startsWith("/") && !href.startsWith("//") && (supportedInternalRoutes.has(href) || /^\/(artists|songs|releases|gallery)\/[a-z0-9-]+$/.test(href));
};

export class SiteConfigurationValidationService {
  validateHomepageSections(sections: PublicSiteConfigSection[] = []) {
    const sectionErrors: Record<string, string[]> = {};
    const ids = new Set<string>();
    const singletonTypes = new Set<string>();
    sections.forEach((section) => {
      const errors: string[] = [];
      if (!section.sectionId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.sectionId)) errors.push("Section ID must be lowercase and URL-safe.");
      if (ids.has(section.sectionId)) errors.push("Duplicate section ID.");
      ids.add(section.sectionId);
      const definition = homepageSectionRegistry.get(section.sectionType);
      if (!definition) errors.push("Unsupported section type.");
      if (definition && !definition.multipleAllowed && singletonTypes.has(section.sectionType)) errors.push(`${definition.displayName} can only appear once.`);
      if (definition && !definition.multipleAllowed) singletonTypes.add(section.sectionType);
      if (!Number.isFinite(Number(section.sortOrder))) errors.push("Sort order must be numeric.");
      Object.entries(section.configuration ?? {}).forEach(([key, value]) => {
        if (key.toLowerCase().includes("route") || key.toLowerCase().includes("href") || key.toLowerCase().includes("url")) {
          if (isPrivateUrl(value)) errors.push(`${key} must not contain private or signed media.`);
          if (typeof value === "string" && value && !isValidHref(value, value.startsWith("https://"))) errors.push(`${key} is not a supported safe URL.`);
        }
      });
      if (section.enabled && section.sectionType === "custom" && !section.title?.trim()) errors.push("Enabled custom sections require a title.");
      if (errors.length) sectionErrors[section.sectionId || "unknown"] = errors;
    });
    return sectionErrors;
  }

  validateLinks(links: PublicSiteNavigationLink[] = [], label: string) {
    const errors: string[] = [];
    links.forEach((link) => {
      if (!link.label?.trim()) errors.push(`${label} link label is required.`);
      if (link.enabled !== false && !isValidHref(link.href, Boolean(link.external))) errors.push(`${label} link "${link.label || link.href}" has an invalid URL.`);
      if (link.href?.startsWith("/admin")) errors.push(`${label} must not link to admin routes.`);
    });
    return errors;
  }

  buildValidationResult(config: PublicSiteConfig) {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const fieldErrors: Record<string, string> = {};
    if (!config.siteName?.trim()) fieldErrors.siteName = "Site name is required.";
    if (!config.siteDescription?.trim()) fieldErrors.siteDescription = "Site description is required.";
    const sectionErrors = this.validateHomepageSections(config.homepageSections);
    if (Object.keys(sectionErrors).length) blockingIssues.push("Homepage sections contain validation errors.");
    blockingIssues.push(...this.validateLinks(config.navigationLinks, "Navigation"));
    blockingIssues.push(...this.validateLinks(config.footerLinks, "Footer"));
    Object.entries(config.socialLinks ?? {}).forEach(([platform, url]) => {
      if (url && !String(url).startsWith("https://")) blockingIssues.push(`Social link ${platform} must be HTTPS.`);
    });
    [config.brandLogoUrl, config.defaultCoverArtUrl, config.defaultArtistImageUrl, config.defaultSocialImageUrl].forEach((url) => {
      if (isPrivateUrl(url)) blockingIssues.push("Brand and fallback media must not use private, signed, blob, or data URLs.");
    });
    if (config.newsletterEnabled) warnings.push("Newsletter backend is scheduled for ANM-WEB-094+; keep disabled until operational.");
    return {
      valid: Object.keys(fieldErrors).length === 0 && blockingIssues.length === 0,
      blockingIssues,
      warnings,
      sectionErrors,
      fieldErrors,
      missingFields: Object.keys(fieldErrors),
      checkedAt: new Date().toISOString(),
    };
  }
}

export const siteConfigurationValidationService = new SiteConfigurationValidationService();

import type { HomepageSectionType, PublicSiteConfig, PublicSiteConfigSection } from "../../models/admin";
import { getHomepageSectionComponent } from "../../components/homepage";
import { getHomepageAdminStats } from "./adminStats";

export type AdminHomepageEnabledFilter = "all" | "enabled" | "disabled";
export type AdminHomepageSectionTypeFilter = "all" | HomepageSectionType;
export type AdminHomepageSortMode = "sortOrder" | "sectionType" | "title" | "enabled";
export type HomepageSectionPublicStatus = "public" | "hidden" | "needs_setup";

export interface AdminHomepageMissingDataFlags {
  missingSectionId: boolean;
  missingSectionType: boolean;
  unsupportedSectionType: boolean;
  missingSortOrder: boolean;
  missingTitleWhenRequired: boolean;
  missingFeaturedReleaseConfiguration: boolean;
  missingCtaRoute: boolean;
}

const sectionTypeLabels: Record<HomepageSectionType, string> = {
  hero: "Hero",
  featured_release: "Featured Release",
  latest_releases: "Latest Releases",
  artist_spotlight: "Artist Spotlight",
  about: "About",
  explore_artists_cta: "Explore Artists CTA",
  gallery_preview: "Gallery Preview",
  custom: "Custom",
};

const requiredTitleTypes: HomepageSectionType[] = ["custom"];

const getSectionText = (section: PublicSiteConfigSection): string =>
  [
    section.sectionId,
    section.sectionType,
    section.title,
    section.subtitle,
    section.configuration?.title,
    section.configuration?.subtitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const formatHomepageSectionType = (sectionType: HomepageSectionType): string =>
  sectionTypeLabels[sectionType] ?? "Custom";

export const getHomepageSectionTitle = (section: PublicSiteConfigSection): string =>
  section.title || String(section.configuration?.title || "") || formatHomepageSectionType(section.sectionType);

export const getHomepageSectionSubtitle = (section: PublicSiteConfigSection): string =>
  section.subtitle || String(section.configuration?.subtitle || "") || `Section ID: ${section.sectionId || "missing"}`;

export const searchAdminHomepageSections = (
  sections: readonly PublicSiteConfigSection[],
  query: string,
): PublicSiteConfigSection[] => {
  const value = query.trim().toLowerCase();
  if (!value) return [...sections];
  return sections.filter((section) => getSectionText(section).includes(value));
};

export const filterAdminHomepageSections = (
  sections: readonly PublicSiteConfigSection[],
  enabledFilter: AdminHomepageEnabledFilter,
  sectionTypeFilter: AdminHomepageSectionTypeFilter,
): PublicSiteConfigSection[] =>
  sections.filter((section) => {
    const enabledMatches =
      enabledFilter === "all" || (enabledFilter === "enabled" ? section.enabled : !section.enabled);
    const typeMatches = sectionTypeFilter === "all" || section.sectionType === sectionTypeFilter;
    return enabledMatches && typeMatches;
  });

export const sortAdminHomepageSections = (
  sections: readonly PublicSiteConfigSection[],
  sortMode: AdminHomepageSortMode,
): PublicSiteConfigSection[] =>
  [...sections].sort((a, b) => {
    if (sortMode === "sectionType") return a.sectionType.localeCompare(b.sectionType) || a.sortOrder - b.sortOrder;
    if (sortMode === "title") return getHomepageSectionTitle(a).localeCompare(getHomepageSectionTitle(b));
    if (sortMode === "enabled") return Number(b.enabled) - Number(a.enabled) || a.sortOrder - b.sortOrder;
    return a.sortOrder - b.sortOrder || a.sectionId.localeCompare(b.sectionId);
  });

export const getAvailableAdminHomepageSectionTypes = (
  sections: readonly PublicSiteConfigSection[],
): HomepageSectionType[] =>
  [...new Set(sections.map((section) => section.sectionType))].sort((a, b) =>
    formatHomepageSectionType(a).localeCompare(formatHomepageSectionType(b)),
  );

export const getAdminHomepageStats = (siteConfig: PublicSiteConfig | undefined) => {
  const sections = siteConfig?.homepageSections ?? [];
  const baseStats = getHomepageAdminStats(siteConfig);

  return {
    ...baseStats,
    heroSections: sections.filter((section) => section.sectionType === "hero").length,
    featuredSections: sections.filter((section) =>
      ["featured_release", "latest_releases", "artist_spotlight", "gallery_preview"].includes(section.sectionType),
    ).length,
    customSections: sections.filter((section) => section.sectionType === "custom").length,
  };
};

export const getHomepageSectionMissingDataFlags = (
  section: PublicSiteConfigSection,
): AdminHomepageMissingDataFlags => {
  const unsupportedSectionType = !getHomepageSectionComponent(section.sectionType) && section.sectionType !== "custom";

  return {
    missingSectionId: !section.sectionId?.trim(),
    missingSectionType: !section.sectionType,
    unsupportedSectionType,
    missingSortOrder: typeof section.sortOrder !== "number" || Number.isNaN(section.sortOrder),
    missingTitleWhenRequired: requiredTitleTypes.includes(section.sectionType) && !getHomepageSectionTitle(section).trim(),
    missingFeaturedReleaseConfiguration:
      section.sectionType === "featured_release" &&
      Boolean(section.configuration?.releaseId) &&
      !String(section.configuration.releaseId).trim(),
    missingCtaRoute:
      section.sectionType === "explore_artists_cta" &&
      Boolean(section.configuration?.ctaHref) &&
      !String(section.configuration.ctaHref).trim(),
  };
};

export const getHomepageSectionMissingDataLabels = (section: PublicSiteConfigSection): string[] => {
  const flags = getHomepageSectionMissingDataFlags(section);
  const labels: string[] = [];
  if (flags.missingSectionId) labels.push("Section ID");
  if (flags.missingSectionType) labels.push("Type");
  if (flags.unsupportedSectionType) labels.push("Unsupported Type");
  if (flags.missingSortOrder) labels.push("Sort Order");
  if (flags.missingTitleWhenRequired) labels.push("Title");
  if (flags.missingFeaturedReleaseConfiguration) labels.push("Featured Release");
  if (flags.missingCtaRoute) labels.push("CTA Route");
  return labels;
};

export const validateAdminHomepageSection = (section: PublicSiteConfigSection): boolean =>
  getHomepageSectionMissingDataLabels(section).length === 0;

export const getHomepageSectionPublicStatus = (section: PublicSiteConfigSection): HomepageSectionPublicStatus => {
  if (!section.enabled) return "hidden";
  return validateAdminHomepageSection(section) ? "public" : "needs_setup";
};

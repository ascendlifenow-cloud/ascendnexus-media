import type { HomepageSectionConfig, HomepageSectionType } from "../models/homepage";

const supportedHomepageSectionTypes: HomepageSectionType[] = [
  "hero",
  "featured_release",
  "latest_releases",
  "artist_spotlight",
  "about",
  "explore_artists_cta",
  "gallery_preview",
  "custom",
];

export const isSupportedHomepageSectionType = (
  sectionType: string | null | undefined,
): sectionType is HomepageSectionType =>
  supportedHomepageSectionTypes.includes(sectionType as HomepageSectionType);

export const validateHomepageSectionConfig = (section: HomepageSectionConfig | null | undefined): boolean =>
  Boolean(section?.sectionId?.trim() && isSupportedHomepageSectionType(section.sectionType));

export const sortHomepageSections = (
  sections: readonly HomepageSectionConfig[] | null | undefined,
): HomepageSectionConfig[] =>
  (Array.isArray(sections) ? [...sections] : []).sort((a, b) => {
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.sectionId.localeCompare(b.sectionId);
  });

export const filterEnabledHomepageSections = (
  sections: readonly HomepageSectionConfig[] | null | undefined,
): HomepageSectionConfig[] => {
  const seenSectionIds = new Set<string>();

  return sortHomepageSections(sections).filter((section) => {
    if (!validateHomepageSectionConfig(section) || !section.enabled) return false;

    if (seenSectionIds.has(section.sectionId)) {
      if (import.meta.env.DEV) {
        console.warn(`Duplicate homepage section ID skipped: ${section.sectionId}`);
      }
      return false;
    }

    seenSectionIds.add(section.sectionId);
    return true;
  });
};

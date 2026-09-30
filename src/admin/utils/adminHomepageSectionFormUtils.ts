import type { HomepageSectionType, PublicSiteConfigSection } from "../../models/admin";
import { getHomepageSectionComponent } from "../../components/homepage";

export type HomepageSectionVisibilityState = "public" | "hidden" | "needs_setup" | "unsupported_type";

export interface AdminHomepageSectionFormState {
  sectionId: string;
  sectionType: HomepageSectionType;
  title: string;
  subtitle: string;
  eyebrow: string;
  description: string;
  enabled: boolean;
  sortOrder: string;
  primaryCtaLabel: string;
  primaryCtaRoute: string;
  secondaryCtaLabel: string;
  secondaryCtaRoute: string;
  backgroundImageUrl: string;
  releaseId: string;
  placement: string;
  showAudioPreview: boolean;
  fallbackToLatest: boolean;
  maxReleasesPerArtist: string;
  showArtistGrouping: boolean;
  maxArtists: string;
  featuredOnly: boolean;
  showLatestRelease: boolean;
  showFeatureCards: boolean;
  visualPanelEnabled: boolean;
  maxItems: string;
  mediaTypeFilter: string;
  rawConfiguration: string;
}

export interface AdminHomepageSectionFormValidation {
  valid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export const homepageSectionTypeLabels: Record<HomepageSectionType, string> = {
  hero: "Hero",
  featured_release: "Featured Release",
  latest_releases: "Latest Releases",
  artist_spotlight: "Artist Spotlight",
  about: "About",
  explore_artists_cta: "Explore Artists CTA",
  gallery_preview: "Gallery Preview",
  custom: "Custom",
};

const supportedSectionTypes = Object.keys(homepageSectionTypeLabels) as HomepageSectionType[];

export const slugifyHomepageSectionValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const validateHomepageSectionId = (sectionId: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sectionId.trim());

const validInternalRoute = (value: string): boolean => {
  const route = value.trim();
  if (!route) return true;
  return route.startsWith("/") && !route.startsWith("//") && !/^javascript:/i.test(route);
};

const positiveNumber = (value: string): boolean => {
  if (!value.trim()) return true;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
};

const configValue = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const optionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  return Number(value);
};

const compactConfig = (entries: Record<string, string | number | boolean | null | undefined>) =>
  Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined && value !== "")) as Record<
    string,
    string | number | boolean | null
  >;

export const createEmptyHomepageSectionFormState = (): AdminHomepageSectionFormState => ({
  sectionId: "",
  sectionType: "custom",
  title: "",
  subtitle: "",
  eyebrow: "",
  description: "",
  enabled: false,
  sortOrder: "100",
  primaryCtaLabel: "",
  primaryCtaRoute: "",
  secondaryCtaLabel: "",
  secondaryCtaRoute: "",
  backgroundImageUrl: "",
  releaseId: "",
  placement: "homepage",
  showAudioPreview: true,
  fallbackToLatest: true,
  maxReleasesPerArtist: "3",
  showArtistGrouping: true,
  maxArtists: "6",
  featuredOnly: false,
  showLatestRelease: true,
  showFeatureCards: true,
  visualPanelEnabled: true,
  maxItems: "6",
  mediaTypeFilter: "",
  rawConfiguration: "",
});

export const mapHomepageSectionToFormState = (section: PublicSiteConfigSection): AdminHomepageSectionFormState => {
  const config = section.configuration ?? {};
  return {
    ...createEmptyHomepageSectionFormState(),
    sectionId: section.sectionId,
    sectionType: section.sectionType,
    title: section.title ?? String(config.title ?? ""),
    subtitle: section.subtitle ?? String(config.subtitle ?? ""),
    eyebrow: String(config.eyebrow ?? ""),
    description: String(config.description ?? ""),
    enabled: section.enabled,
    sortOrder: String(section.sortOrder),
    primaryCtaLabel: String(config.primaryCtaLabel ?? config.ctaLabel ?? ""),
    primaryCtaRoute: String(config.primaryCtaRoute ?? config.ctaHref ?? ""),
    secondaryCtaLabel: String(config.secondaryCtaLabel ?? ""),
    secondaryCtaRoute: String(config.secondaryCtaRoute ?? ""),
    backgroundImageUrl: String(config.backgroundImageUrl ?? ""),
    releaseId: String(config.releaseId ?? ""),
    placement: String(config.placement ?? "homepage"),
    showAudioPreview: config.showAudioPreview !== false,
    fallbackToLatest: config.fallbackToLatest !== false,
    maxReleasesPerArtist: String(config.maxReleasesPerArtist ?? "3"),
    showArtistGrouping: config.showArtistGrouping !== false,
    maxArtists: String(config.maxArtists ?? "6"),
    featuredOnly: Boolean(config.featuredOnly),
    showLatestRelease: config.showLatestRelease !== false,
    showFeatureCards: config.showFeatureCards !== false,
    visualPanelEnabled: config.visualPanelEnabled !== false,
    maxItems: String(config.maxItems ?? "6"),
    mediaTypeFilter: String(config.mediaTypeFilter ?? ""),
    rawConfiguration: JSON.stringify(config, null, 2),
  };
};

export const normalizeHomepageSectionConfig = (
  state: AdminHomepageSectionFormState,
): Record<string, string | number | boolean | null> => {
  const displayConfig = {
    title: configValue(state.title),
    subtitle: configValue(state.subtitle),
    eyebrow: configValue(state.eyebrow),
    description: configValue(state.description),
  };

  if (state.sectionType === "custom") {
    try {
      const parsed = state.rawConfiguration.trim() ? JSON.parse(state.rawConfiguration) : {};
      return compactConfig({ ...parsed, ...displayConfig });
    } catch {
      return compactConfig({ ...displayConfig, rawConfiguration: state.rawConfiguration });
    }
  }

  if (state.sectionType === "hero" || state.sectionType === "explore_artists_cta") {
    return compactConfig({
      ...displayConfig,
      primaryCtaLabel: configValue(state.primaryCtaLabel),
      primaryCtaRoute: configValue(state.primaryCtaRoute),
      secondaryCtaLabel: configValue(state.secondaryCtaLabel),
      secondaryCtaRoute: configValue(state.secondaryCtaRoute),
      backgroundImageUrl: state.sectionType === "hero" ? configValue(state.backgroundImageUrl) : undefined,
    });
  }

  if (state.sectionType === "featured_release") {
    return compactConfig({
      ...displayConfig,
      releaseId: configValue(state.releaseId),
      placement: configValue(state.placement),
      showAudioPreview: state.showAudioPreview,
      fallbackToLatest: state.fallbackToLatest,
    });
  }

  if (state.sectionType === "latest_releases") {
    return compactConfig({
      ...displayConfig,
      maxReleasesPerArtist: optionalNumber(state.maxReleasesPerArtist),
      showArtistGrouping: state.showArtistGrouping,
      showAudioPreview: state.showAudioPreview,
    });
  }

  if (state.sectionType === "artist_spotlight") {
    return compactConfig({
      ...displayConfig,
      maxArtists: optionalNumber(state.maxArtists),
      featuredOnly: state.featuredOnly,
      showLatestRelease: state.showLatestRelease,
    });
  }

  if (state.sectionType === "about") {
    return compactConfig({
      ...displayConfig,
      showFeatureCards: state.showFeatureCards,
      visualPanelEnabled: state.visualPanelEnabled,
    });
  }

  if (state.sectionType === "gallery_preview") {
    return compactConfig({
      ...displayConfig,
      maxItems: optionalNumber(state.maxItems),
      mediaTypeFilter: configValue(state.mediaTypeFilter),
    });
  }

  return compactConfig(displayConfig);
};

export const getHomepageSectionFormMissingFields = (state: AdminHomepageSectionFormState): string[] => {
  const fields: string[] = [];
  if (!state.sectionId.trim()) fields.push("Section ID");
  if (!state.sectionType) fields.push("Section Type");
  if (!state.sortOrder.trim()) fields.push("Sort Order");
  if (state.sectionType === "custom" && !state.title.trim()) fields.push("Custom Title");
  return fields;
};

export const validateHomepageSectionConfig = (state: AdminHomepageSectionFormState): Record<string, string> => {
  const errors: Record<string, string> = {};
  if ((state.sectionType === "hero" || state.sectionType === "explore_artists_cta") && !validInternalRoute(state.primaryCtaRoute)) {
    errors.primaryCtaRoute = "Primary CTA route must be an internal route.";
  }
  if ((state.sectionType === "hero" || state.sectionType === "explore_artists_cta") && !validInternalRoute(state.secondaryCtaRoute)) {
    errors.secondaryCtaRoute = "Secondary CTA route must be an internal route.";
  }
  if (state.sectionType === "latest_releases" && !positiveNumber(state.maxReleasesPerArtist)) {
    errors.maxReleasesPerArtist = "Max releases per artist must be a positive number.";
  }
  if (state.sectionType === "artist_spotlight" && !positiveNumber(state.maxArtists)) {
    errors.maxArtists = "Max artists must be a positive number.";
  }
  if (state.sectionType === "gallery_preview" && !positiveNumber(state.maxItems)) {
    errors.maxItems = "Max items must be a positive number.";
  }
  if (state.sectionType === "custom" && state.rawConfiguration.trim()) {
    try {
      JSON.parse(state.rawConfiguration);
    } catch {
      errors.rawConfiguration = "Custom configuration JSON is invalid.";
    }
  }
  return errors;
};

export const validateHomepageSectionPublicReadiness = (state: AdminHomepageSectionFormState): string[] => {
  if (!state.enabled) return [];
  const missing = getHomepageSectionFormMissingFields(state);
  if (state.sectionType === "custom" && !state.rawConfiguration.trim()) missing.push("Custom Configuration");
  return missing;
};

export const getHomepageSectionPublicVisibilityState = (
  state: AdminHomepageSectionFormState,
): HomepageSectionVisibilityState => {
  if (!state.enabled) return "hidden";
  if (state.sectionType !== "custom" && !getHomepageSectionComponent(state.sectionType)) return "unsupported_type";
  if (validateHomepageSectionPublicReadiness(state).length > 0 || Object.keys(validateHomepageSectionConfig(state)).length > 0) {
    return "needs_setup";
  }
  return "public";
};

export const validateHomepageSectionForm = (
  state: AdminHomepageSectionFormState,
): AdminHomepageSectionFormValidation => {
  const errors: Record<string, string> = {};
  if (!state.sectionId.trim()) errors.sectionId = "Section ID is required.";
  if (state.sectionId.trim() && !validateHomepageSectionId(state.sectionId)) {
    errors.sectionId = "Section ID must be lowercase, URL-safe, and hyphen-separated.";
  }
  if (!supportedSectionTypes.includes(state.sectionType)) errors.sectionType = "Section type is unsupported.";
  if (!state.sortOrder.trim() || !Number.isFinite(Number(state.sortOrder))) errors.sortOrder = "Sort order must be numeric.";
  Object.assign(errors, validateHomepageSectionConfig(state));

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    missingFields: getHomepageSectionFormMissingFields(state),
  };
};

export const toHomepageSectionConfig = (state: AdminHomepageSectionFormState): PublicSiteConfigSection => ({
  sectionId: state.sectionId.trim(),
  sectionType: state.sectionType,
  enabled: state.enabled,
  sortOrder: Number(state.sortOrder) || 0,
  title: state.title.trim() || undefined,
  subtitle: state.subtitle.trim() || undefined,
  configuration: normalizeHomepageSectionConfig(state),
});

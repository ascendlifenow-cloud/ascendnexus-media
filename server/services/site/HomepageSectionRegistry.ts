import type { HomepageSectionType } from "../../../src/models/admin";

export interface HomepageSectionDefinition {
  sectionType: HomepageSectionType;
  displayName: string;
  multipleAllowed: boolean;
  defaultConfig: Record<string, string | number | boolean | null>;
}

export const homepageSectionDefinitions: HomepageSectionDefinition[] = [
  { sectionType: "hero", displayName: "Hero", multipleAllowed: false, defaultConfig: { primaryCtaLabel: "Explore Artists", primaryCtaRoute: "/artists" } },
  { sectionType: "featured_release", displayName: "Featured Release", multipleAllowed: true, defaultConfig: { fallbackToLatest: true, showAudioPreview: true } },
  { sectionType: "latest_releases", displayName: "Latest Releases", multipleAllowed: false, defaultConfig: { maxReleasesPerArtist: 3, showArtistGrouping: true, showAudioPreview: true } },
  { sectionType: "artist_spotlight", displayName: "Artist Spotlight", multipleAllowed: true, defaultConfig: { maxArtists: 6, showLatestRelease: true } },
  { sectionType: "gallery_preview", displayName: "Gallery Preview", multipleAllowed: true, defaultConfig: { maxItems: 6 } },
  { sectionType: "about", displayName: "About", multipleAllowed: false, defaultConfig: { showFeatureCards: true, visualPanelEnabled: true } },
  { sectionType: "explore_artists_cta", displayName: "Explore Artists CTA", multipleAllowed: true, defaultConfig: { primaryCtaLabel: "Meet the Artists", primaryCtaRoute: "/artists" } },
  { sectionType: "custom", displayName: "Custom Text", multipleAllowed: true, defaultConfig: {} },
];

export class HomepageSectionRegistry {
  private readonly definitions = new Map(homepageSectionDefinitions.map((definition) => [definition.sectionType, definition]));

  get(sectionType: string) {
    return this.definitions.get(sectionType as HomepageSectionType);
  }

  isSupported(sectionType: string): sectionType is HomepageSectionType {
    return this.definitions.has(sectionType as HomepageSectionType);
  }

  list() {
    return homepageSectionDefinitions;
  }
}

export const homepageSectionRegistry = new HomepageSectionRegistry();

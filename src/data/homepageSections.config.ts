import type { HomepageSectionConfig } from "../models/homepage";

export const defaultHomepageSectionsConfig: HomepageSectionConfig[] = [
  {
    sectionId: "homepage-hero",
    sectionType: "hero",
    enabled: true,
    sortOrder: 10,
  },
  {
    sectionId: "homepage-featured-release",
    sectionType: "featured_release",
    enabled: true,
    sortOrder: 20,
  },
  {
    sectionId: "homepage-latest-releases",
    sectionType: "latest_releases",
    enabled: true,
    sortOrder: 30,
    configuration: {
      maxReleasesPerArtist: 3,
    },
  },
  {
    sectionId: "homepage-artist-spotlight",
    sectionType: "artist_spotlight",
    enabled: true,
    sortOrder: 40,
    configuration: {
      maxArtists: 6,
    },
  },
  {
    sectionId: "homepage-about",
    sectionType: "about",
    enabled: true,
    sortOrder: 50,
  },
  {
    sectionId: "homepage-explore-artists-cta",
    sectionType: "explore_artists_cta",
    enabled: true,
    sortOrder: 60,
  },
];

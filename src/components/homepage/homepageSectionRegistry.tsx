import type { ComponentType } from "react";
import { AboutSection } from "../AboutSection";
import { ExploreArtistsCTA } from "../ExploreArtistsCTA";
import { FeaturedReleaseSection } from "../featured";
import { HeroBanner } from "../HeroBanner";
import { HomepageArtistSpotlight } from "../HomepageArtistSpotlight";
import { LatestReleasesCarousel } from "../LatestReleasesCarousel";
import type { HomepageContent, HomepageSectionConfig, HomepageSectionType } from "../../models/homepage";

export interface HomepageSectionComponentProps {
  section: HomepageSectionConfig;
  content: HomepageContent;
}

const HeroSection = () => <HeroBanner />;

const FeaturedReleaseConfiguredSection = ({ content }: HomepageSectionComponentProps) => (
  <FeaturedReleaseSection featuredRelease={content.featuredRelease} />
);

const LatestReleasesConfiguredSection = ({ content }: HomepageSectionComponentProps) => (
  <LatestReleasesCarousel releaseGroups={content.releaseGroups} />
);

const ArtistSpotlightConfiguredSection = ({ content }: HomepageSectionComponentProps) => (
  <HomepageArtistSpotlight items={content.spotlightArtists} />
);

const AboutConfiguredSection = () => <AboutSection />;

const ExploreArtistsConfiguredSection = () => <ExploreArtistsCTA />;

const GalleryPreviewPlaceholder = () => null;

export const homepageSectionRegistry: Partial<
  Record<HomepageSectionType, ComponentType<HomepageSectionComponentProps>>
> = {
  hero: HeroSection,
  featured_release: FeaturedReleaseConfiguredSection,
  latest_releases: LatestReleasesConfiguredSection,
  artist_spotlight: ArtistSpotlightConfiguredSection,
  about: AboutConfiguredSection,
  explore_artists_cta: ExploreArtistsConfiguredSection,
  gallery_preview: GalleryPreviewPlaceholder,
};

export const getHomepageSectionComponent = (sectionType: HomepageSectionType) =>
  homepageSectionRegistry[sectionType];

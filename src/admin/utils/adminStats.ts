import type { ArtistAdminRecord, MediaAssetRecord, PublicSiteConfig, SongReleaseAdminRecord } from "../../models/admin";

export interface ArtistAdminStats {
  total: number;
  active: number;
  draft: number;
  archived: number;
}

export interface ReleaseAdminStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  featured: number;
}

export interface MediaAdminStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

export interface HomepageAdminStats {
  totalSections: number;
  enabledSections: number;
  disabledSections: number;
}

export const getArtistAdminStats = (artists: readonly ArtistAdminRecord[] = []): ArtistAdminStats => ({
  total: artists.length,
  active: artists.filter((artist) => artist.status === "active").length,
  draft: artists.filter((artist) => artist.status === "draft").length,
  archived: artists.filter((artist) => artist.status === "archived").length,
});

export const getReleaseAdminStats = (releases: readonly SongReleaseAdminRecord[] = []): ReleaseAdminStats => ({
  total: releases.length,
  published: releases.filter((release) => release.status === "published").length,
  draft: releases.filter((release) => release.status === "draft").length,
  archived: releases.filter((release) => release.status === "archived").length,
  featured: releases.filter((release) => Boolean(release.featured)).length,
});

export const getMediaAdminStats = (assets: readonly MediaAssetRecord[] = []): MediaAdminStats => ({
  total: assets.length,
  published: assets.filter((asset) => asset.status === "published").length,
  draft: assets.filter((asset) => asset.status === "draft").length,
  archived: assets.filter((asset) => asset.status === "archived").length,
});

export const getHomepageAdminStats = (siteConfig: PublicSiteConfig | undefined): HomepageAdminStats => {
  const sections = siteConfig?.homepageSections ?? [];

  return {
    totalSections: sections.length,
    enabledSections: sections.filter((section) => section.enabled).length,
    disabledSections: sections.filter((section) => !section.enabled).length,
  };
};

export const getMissingMetadataCount = (
  artists: readonly ArtistAdminRecord[] = [],
  releases: readonly SongReleaseAdminRecord[] = [],
): number =>
  artists.filter((artist) => !artist.seoMetadata || !artist.socialMetadata).length +
  releases.filter((release) => !release.seoMetadata || !release.socialMetadata).length;

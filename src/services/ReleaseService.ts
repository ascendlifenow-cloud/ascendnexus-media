import { publicArtistsSeed, publicSongReleasesSeed } from "../data";
import type { ArtistReleaseGroup, FeaturedReleaseItem } from "../models/homepage";
import type { PublicSongRelease } from "../models/release";
import {
  getFeaturedReleaseForArtist,
  getFeaturedReleaseItem,
  getFeaturedReleases,
  getHomepageFeaturedReleases,
  getHomepageLatestReleaseGroups,
  getLatestReleases,
  getLatestReleasesByArtist,
  getMoreReleasesFromArtist,
  getPrimaryHomepageFeaturedRelease,
  getPublishedReleaseBySlug,
  sortReleasesNewestFirst,
} from "../utils/publicDataSelectors";

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export class ReleaseService {
  async getPublicReleases(): Promise<PublicSongRelease[]> {
    await delay();
    return sortReleasesNewestFirst(publicSongReleasesSeed);
  }

  async getPublishedReleases(): Promise<PublicSongRelease[]> {
    await delay();
    return getLatestReleases(publicSongReleasesSeed);
  }

  async getLatestPublishedByArtist(artistId: string, limit = 3): Promise<PublicSongRelease[]> {
    await delay();
    return getLatestReleasesByArtist(publicSongReleasesSeed, artistId, limit);
  }

  async getPublishedReleasesByArtistId(artistId: string): Promise<PublicSongRelease[]> {
    await delay();
    return getLatestReleasesByArtist(publicSongReleasesSeed, artistId);
  }

  async getLatestReleaseByArtistId(artistId: string): Promise<PublicSongRelease | undefined> {
    const releases = await this.getPublishedReleasesByArtistId(artistId);
    return releases[0];
  }

  async getReleaseBySlug(slug: string): Promise<PublicSongRelease | undefined> {
    await delay();
    return getPublishedReleaseBySlug(publicSongReleasesSeed, slug) ?? undefined;
  }

  async getPublishedReleaseBySlug(slug: string): Promise<PublicSongRelease | undefined> {
    return this.getReleaseBySlug(slug);
  }

  async getMoreReleasesFromArtist(
    artistId: string,
    excludeReleaseId: string,
    limit = 3,
  ): Promise<PublicSongRelease[]> {
    await delay();
    return getMoreReleasesFromArtist(publicSongReleasesSeed, artistId, excludeReleaseId, limit);
  }

  async getLatestReleasesByArtist(artistId: string, limit = 3): Promise<PublicSongRelease[]> {
    await delay();
    return getLatestReleasesByArtist(publicSongReleasesSeed, artistId, limit);
  }

  async getLatestReleasesGroupedByArtist(limit = 3): Promise<Record<string, PublicSongRelease[]>> {
    await delay();
    return getLatestReleases(publicSongReleasesSeed).reduce<Record<string, PublicSongRelease[]>>(
      (groups, release) => {
        const current = groups[release.artistId] ?? [];
        if (current.length < limit) {
          groups[release.artistId] = [...current, release];
        }
        return groups;
      },
      {},
    );
  }

  async getHomepageLatestReleaseGroups(): Promise<ArtistReleaseGroup[]> {
    await delay();
    return getHomepageLatestReleaseGroups(publicArtistsSeed, publicSongReleasesSeed);
  }

  async getFeaturedReleases(): Promise<PublicSongRelease[]> {
    await delay();
    return getFeaturedReleases(publicSongReleasesSeed, publicArtistsSeed);
  }

  async getHomepageFeaturedReleases(): Promise<PublicSongRelease[]> {
    await delay();
    return getHomepageFeaturedReleases(publicSongReleasesSeed, publicArtistsSeed);
  }

  async getPrimaryHomepageFeaturedRelease(): Promise<FeaturedReleaseItem | undefined> {
    await delay();
    return getFeaturedReleaseItem(
      getPrimaryHomepageFeaturedRelease(publicSongReleasesSeed, publicArtistsSeed),
      publicArtistsSeed,
    );
  }

  async getFeaturedReleaseForArtist(artistId: string): Promise<PublicSongRelease | undefined> {
    await delay();
    return getFeaturedReleaseForArtist(artistId, publicSongReleasesSeed, publicArtistsSeed);
  }
}

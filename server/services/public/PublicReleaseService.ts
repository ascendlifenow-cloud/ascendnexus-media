import { publicArtistsSeed, publicSongReleasesSeed } from "../../../src/data";
import type { ArtistReleaseGroup } from "../../../src/models/homepage";
import type { PublicSongRelease } from "../../../src/models/release";
import { getBackendConfig } from "../../config/backendConfig";
import { databaseConnectionService } from "../../database/DatabaseConnectionService";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { mapArtistRecordToPublicProfile } from "../../mappers/public/mapArtistRecordToPublicProfile";
import { mapReleaseRecordToPublicSongRelease } from "../../mappers/public/mapReleaseRecordToPublicSongRelease";
import { adminReleaseService } from "../releases/AdminReleaseService";

const publicReleaseFromRecord = (release: Awaited<ReturnType<typeof releaseRepository.listPublic>>[number]): PublicSongRelease =>
  adminReleaseService.sanitizeReleaseForPublic(release) as PublicSongRelease;

const publicArtistFromRecord = (artist: Awaited<ReturnType<typeof artistRepository.listPublic>>[number]) => ({
  artistId: artist.artistId,
  name: artist.name,
  slug: artist.slug,
  displayName: artist.displayName,
  bio: artist.bio,
  profileImage: artist.profileImage ?? artist.profileThumbnailUrl ?? "",
  status: "active" as const,
  sortOrder: artist.sortOrder,
  musicStyle: [...artist.genres, ...artist.styleTags].join(", "),
  featured: artist.featured,
  externalLinks: artist.externalLinks,
});

export class PublicReleaseService {
  async listPublishedReleases(filters: { artistId?: string; genre?: string; styleTag?: string; featured?: boolean } = {}): Promise<PublicSongRelease[]> {
    const persisted = await releaseRepository.listPublic();
    if (persisted.length || databaseConnectionService.isConfigured() || !getBackendConfig().publicDelivery.seedFallbackEnabled) {
      const publicArtistIds = new Set((await artistRepository.listPublic()).map((artist) => artist.artistId));
      return persisted
        .filter((release) => publicArtistIds.has(release.artistId))
        .map(publicReleaseFromRecord)
        .filter((release) => !filters.artistId || release.artistId === filters.artistId)
        .filter((release) => !filters.genre || release.genre.toLowerCase() === filters.genre.toLowerCase())
        .filter((release) => !filters.styleTag || release.styleTags.some((tag) => tag.toLowerCase() === filters.styleTag?.toLowerCase()))
        .filter((release) => filters.featured === undefined || Boolean(release.featured) === filters.featured)
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    }
    return publicSongReleasesSeed
      .map((release) => mapReleaseRecordToPublicSongRelease(release, publicArtistsSeed.find((artist) => artist.artistId === release.artistId)))
      .filter((release): release is PublicSongRelease => Boolean(release))
      .filter((release) => !filters.artistId || release.artistId === filters.artistId)
      .filter((release) => !filters.genre || release.genre.toLowerCase() === filters.genre.toLowerCase())
      .filter((release) => !filters.styleTag || release.styleTags.some((tag) => tag.toLowerCase() === filters.styleTag?.toLowerCase()))
      .filter((release) => filters.featured === undefined || Boolean(release.featured) === filters.featured)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  }

  async getPublishedReleaseBySlug(slugOrId: string): Promise<PublicSongRelease | undefined> {
    const lookup = slugOrId.trim();
    return (await this.listPublishedReleases()).find((release) =>
      release.slug === lookup ||
      release.songId === lookup ||
      release.releaseId === lookup
    );
  }

  async getLatestReleasesByArtist(artistId: string, limit = 3): Promise<PublicSongRelease[]> {
    return (await this.listPublishedReleases({ artistId })).slice(0, limit);
  }

  async getLatestThreeReleasesPerArtist(): Promise<Array<ArtistReleaseGroup & { releaseCount: number; hasMoreReleases: boolean }>> {
    const persistedArtists = await artistRepository.listPublic();
    if (persistedArtists.length || databaseConnectionService.isConfigured() || !getBackendConfig().publicDelivery.seedFallbackEnabled) {
      const releases = await this.listPublishedReleases();
      return persistedArtists
        .map(publicArtistFromRecord)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((artist) => {
          const artistReleases = releases.filter((release) => release.artistId === artist.artistId);
          return {
            artist: artist as never,
            releases: artistReleases.slice(0, 3),
            releaseCount: artistReleases.length,
            hasMoreReleases: artistReleases.length > 3,
          };
        })
        .filter((group) => group.releases.length);
    }
    const artists = publicArtistsSeed
      .map((artist) => mapArtistRecordToPublicProfile(artist, []))
      .filter(Boolean)
      .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
    const releases = await this.listPublishedReleases();
    return artists.map((artist) => {
      const artistReleases = releases.filter((release) => release.artistId === artist?.artistId);
      return {
        artist: artist as never,
        releases: artistReleases.slice(0, 3),
        releaseCount: artistReleases.length,
        hasMoreReleases: artistReleases.length > 3,
      };
    }).filter((group) => group.releases.length);
  }

  async getFeaturedReleases(): Promise<PublicSongRelease[]> {
    return (await this.listPublishedReleases({ featured: true })).sort((a, b) => (a.featuredSortOrder ?? 999) - (b.featuredSortOrder ?? 999));
  }
}

export const publicReleaseService = new PublicReleaseService();

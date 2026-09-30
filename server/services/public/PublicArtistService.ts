import { publicArtistsSeed, publicSongReleasesSeed } from "../../../src/data";
import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicSongRelease } from "../../../src/models/release";
import { getBackendConfig } from "../../config/backendConfig";
import { databaseConnectionService } from "../../database/DatabaseConnectionService";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { mapArtistRecordToPublicProfile } from "../../mappers/public/mapArtistRecordToPublicProfile";
import { mapReleaseRecordToPublicSongRelease } from "../../mappers/public/mapReleaseRecordToPublicSongRelease";
import { adminArtistService } from "../artists/AdminArtistService";

const recordToPublicArtist = (artist: Awaited<ReturnType<typeof artistRepository.listPublic>>[number]): ArtistPublicProfile => {
  const safe = adminArtistService.sanitizeArtistForPublic(artist);
  return {
    artistId: safe.artistId,
    name: safe.name,
    slug: safe.slug,
    displayName: safe.displayName,
    bio: safe.bio,
    profileImage: safe.profileImage,
    profileBannerUrl: safe.profileBannerUrl,
    publicCharacterArtUrl: safe.publicCharacterArtUrl,
    status: "active",
    sortOrder: safe.sortOrder,
    musicStyle: [...safe.genres, ...safe.styleTags].join(", "),
    featured: safe.featured,
    externalLinks: safe.externalLinks,
    genres: safe.genres,
    styleTags: safe.styleTags,
  } as ArtistPublicProfile;
};

const recordToPublicRelease = (release: Awaited<ReturnType<typeof releaseRepository.listPublic>>[number]): PublicSongRelease => ({
  releaseId: release.releaseId,
  songId: release.songId,
  artistId: release.artistId,
  title: release.title,
  slug: release.slug,
  coverArtUrl: release.coverArtUrl,
  audioPreviewUrl: release.audioPreviewUrl,
  releaseDate: release.releaseDate,
  genre: release.genre,
  styleTags: release.styleTags,
  status: "published",
  externalLinks: release.externalLinks,
  featured: release.featured,
  featuredPlacement: release.featuredPlacement as never,
});

export class PublicArtistService {
  async listActivePublishedArtists(): Promise<ArtistPublicProfile[]> {
    const persisted = await artistRepository.listPublic();
    if (persisted.length || databaseConnectionService.isConfigured() || !getBackendConfig().publicDelivery.seedFallbackEnabled) {
      const releases = (await releaseRepository.listPublic()).map(recordToPublicRelease);
      return persisted
        .map((artist) => mapArtistRecordToPublicProfile(recordToPublicArtist(artist), releases))
        .filter(Boolean)
        .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0)) as ArtistPublicProfile[];
    }
    const releases = publicSongReleasesSeed.map((release) => mapReleaseRecordToPublicSongRelease(release, publicArtistsSeed.find((artist) => artist.artistId === release.artistId))).filter(Boolean) as never[];
    return publicArtistsSeed
      .map((artist) => mapArtistRecordToPublicProfile(artist, releases))
      .filter(Boolean)
      .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0)) as ArtistPublicProfile[];
  }

  async getPublishedArtistBySlug(slug: string): Promise<ArtistPublicProfile | undefined> {
    return (await this.listActivePublishedArtists()).find((artist) => artist.slug === slug);
  }

  async getArtistLatestReleases(artistId: string, limit = 3) {
    const persisted = await releaseRepository.latestByArtist(artistId, limit);
    if (persisted.length || databaseConnectionService.isConfigured() || !getBackendConfig().publicDelivery.seedFallbackEnabled) return persisted.map(recordToPublicRelease);
    const artist = publicArtistsSeed.find((item) => item.artistId === artistId);
    if (!artist) return [];
    return publicSongReleasesSeed
      .map((release) => mapReleaseRecordToPublicSongRelease(release, artist))
      .filter((release) => release?.artistId === artistId)
      .sort((a, b) => (b?.releaseDate ?? "").localeCompare(a?.releaseDate ?? ""))
      .slice(0, limit);
  }

  async getFeaturedArtists(limit = 6) {
    return (await this.listActivePublishedArtists()).filter((artist) => artist.featured).slice(0, limit);
  }
}

export const publicArtistService = new PublicArtistService();

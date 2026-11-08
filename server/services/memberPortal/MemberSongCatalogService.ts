import type { MemberDashboardContentCard } from "../../models/memberPortal/MemberPortalModels";
import { evaluateSongAction } from "../access/SongUsageService";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import type { PublicSongRelease, PublicSongDetail } from "../../../src/models/release";
import type { ArtistPublicProfile } from "../../../src/models/artist";
import { AuthApiError } from "../../utils/auth/authErrorUtils";

const safePublicMedia = (value?: string) => value && !/(private\/|signedUrl|signature=|token=|storagePath|privateObjectKey|full[-_]?song)/i.test(value) ? value : undefined;

export class MemberSongCatalogService {
  async getCatalog(memberId: string) {
    const data = await jsonDatabase.read();
    const cards = this.project(data, memberId);
    const eligible = new Set(cards.map(card => card.contentId));
    const publicReleases = eligible.size ? new Map((await publicContentDeliveryService.listPublicReleases()).map(release => [release.releaseId, release])) : new Map<string, PublicSongRelease>();
    const releases: PublicSongRelease[] = data.releaseRecords.filter(release => eligible.has(release.releaseId)).map(release => {
      const decoration = publicReleases.get(release.releaseId);
      return {
        releaseId: release.releaseId, songId: release.songId, artistId: release.artistId,
        title: release.title, slug: release.slug, releaseDate: release.releaseDate,
        description: release.description, lyrics: release.lyrics,
        genre: release.genre ?? "", styleTags: release.styleTags ?? [], status: "published", externalLinks: decoration?.externalLinks ?? {},
        featured: release.featured,
        coverArtUrl: safePublicMedia(decoration?.coverArtUrl),
        coverArtThumbnailUrl: safePublicMedia(decoration?.coverArtThumbnailUrl),
        audioPreviewUrl: safePublicMedia(decoration?.audioPreviewUrl),
      };
    }).sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.releaseId.localeCompare(b.releaseId));
    const artists: ArtistPublicProfile[] = [...new Set(releases.map(release => release.artistId))].map(artistId => {
      const artist = data.artistRecords.find(record => record.artistId === artistId && record.status === "active" && record.publicationState === "published" && !record.deletedAt);
      return { artistId, name: artist?.name ?? "Artist", displayName: artist?.displayName ?? "Artist",
        slug: artist?.slug ?? artistId, bio: "", profileImage: "", status: "active", sortOrder: artist?.sortOrder ?? 0,
        musicStyle: "", featured: false };
    });
    const releaseById = new Map(releases.map(release => [release.releaseId, release]));
    const items = cards.map(card => {
      const release = releaseById.get(card.contentId);
      return { ...card, imageUrl: release?.coverArtThumbnailUrl ?? release?.coverArtUrl,
        audioPreviewUrl: release?.audioPreviewUrl, previewAvailable: Boolean(release?.audioPreviewUrl) };
    });
    return { items, releases, artists };
  }

  async getDetail(memberId: string, slugOrId: string): Promise<PublicSongDetail> {
    const catalog = await this.getCatalog(memberId);
    const song = catalog.releases.find(release => release.slug === slugOrId || release.releaseId === slugOrId || release.songId === slugOrId);
    if (!song) throw new AuthApiError("SONG_UNAVAILABLE", "Song is unavailable.", 404);
    return { song, artist: catalog.artists.find(artist => artist.artistId === song.artistId),
      moreReleases: catalog.releases.filter(release => release.artistId === song.artistId && release.releaseId !== song.releaseId).slice(0, 3) };
  }

  async list(memberId: string): Promise<MemberDashboardContentCard[]> {
    return (await this.getCatalog(memberId)).items;
  }

  project(data: MediaDatabaseShape, memberId: string): MemberDashboardContentCard[] {
    return data.releaseRecords.flatMap((release): MemberDashboardContentCard[] => {
      const stream = evaluateSongAction(data, memberId, release.releaseId, "stream");
      // An exhausted included play remains discoverable, but is never playable.
      if (!stream.allowed && stream.reasonCode !== "PROTECTED_CONTENT_PLAY_ALLOWANCE_USED") return [];
      const download = evaluateSongAction(data, memberId, release.releaseId, "download");
      // Deliberately project metadata only: catalog discovery must not expose media locations.
      return [{
        contentType: "release", contentId: release.releaseId, title: release.title,
        subtitle: release.genre, href: `/songs/${encodeURIComponent(release.slug)}`,
        releaseDate: release.releaseDate, accessState: "allowed", accessLabel: "Member",
        previewAvailable: false, streamAvailable: stream.allowed, downloadAvailable: download.allowed,
      }];
    }).sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || a.contentId.localeCompare(b.contentId));
  }
}

export const memberSongCatalogService = new MemberSongCatalogService();

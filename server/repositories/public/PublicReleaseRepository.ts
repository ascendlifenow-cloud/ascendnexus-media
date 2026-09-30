import { releaseRepository } from "../ReleaseRepository";
import { publicArtistRepository } from "./PublicArtistRepository";

export class PublicReleaseRepository {
  async listPublishedReleases() {
    const [releases, artists] = await Promise.all([releaseRepository.listPublic(), publicArtistRepository.listPublishedArtists()]);
    const artistIds = new Set(artists.map((artist) => artist.artistId));
    return releases.filter((release) => artistIds.has(release.artistId));
  }

  async getPublishedReleaseBySlug(slugOrId: string) {
    const lookup = slugOrId.trim();
    return (await this.listPublishedReleases()).find((release) =>
      release.slug === lookup ||
      release.songId === lookup ||
      release.releaseId === lookup
    ) ?? null;
  }

  async getPublishedReleaseById(releaseId: string) {
    return (await this.listPublishedReleases()).find((release) => release.releaseId === releaseId) ?? null;
  }

  async getLatestPublishedReleases(limit = 24) {
    return (await this.listPublishedReleases()).sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, limit);
  }

  async getFeaturedPublishedReleases(limit = 12, placement?: string) {
    return (await this.listPublishedReleases())
      .filter((release) => release.featured && (!placement || release.featuredPlacement === placement))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
      .slice(0, limit);
  }

  async getPublishedReleasesByArtist(artistId: string) {
    return (await this.listPublishedReleases()).filter((release) => release.artistId === artistId);
  }
}

export const publicReleaseRepository = new PublicReleaseRepository();

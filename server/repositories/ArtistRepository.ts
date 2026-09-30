import type { ArtistRecord } from "../models/artists/ArtistModel";
import { BaseRepository } from "./BaseRepository";
export class ArtistRepository extends BaseRepository<ArtistRecord & Record<string, unknown>> {
  constructor() { super("artistRecords", "artistId"); }
  async listPublic() { return (await this.list()).filter((artist) => artist.status === "active" && artist.publicationState === "published" && artist.publicVisibility); }
  findById(artistId: string) { return this.get(artistId); }
  findBySlug(slug: string) { return this.findBy("slug", slug); }
  async existsBySlug(slug: string, excludeArtistId?: string) {
    const artist = await this.findBySlug(slug);
    return Boolean(artist && artist.artistId !== excludeArtistId);
  }
  async listAdmin(filters: { status?: string; search?: string; featured?: boolean } = {}) {
    const search = filters.search?.trim().toLowerCase();
    return (await this.list({ includeArchived: filters.status === "archived", sort: "updatedAt", direction: "desc" }))
      .filter((artist) => !filters.status || filters.status === "all" || artist.status === filters.status)
      .filter((artist) => filters.featured === undefined || artist.featured === filters.featured)
      .filter((artist) => !search || [
        artist.artistId,
        artist.name,
        artist.displayName,
        artist.slug,
        ...(artist.genres ?? []),
        ...(artist.styleTags ?? []),
      ].some((value) => String(value).toLowerCase().includes(search)));
  }
  async countByStatus() {
    const artists = await this.list({ includeArchived: true });
    return artists.reduce<Record<string, number>>((acc, artist) => {
      acc[artist.status] = (acc[artist.status] ?? 0) + 1;
      return acc;
    }, {});
  }
  getPublicPublishedBySlug(slug: string) {
    return this.listPublic().then((artists) => artists.find((artist) => artist.slug === slug) ?? null);
  }
  getActivePublishedArtists() {
    return this.listPublic();
  }
}
export const artistRepository = new ArtistRepository();

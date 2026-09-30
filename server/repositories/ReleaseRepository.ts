import type { SongReleaseRecord } from "../models/releases/SongReleaseModel";
import { BaseRepository } from "./BaseRepository";
export class ReleaseRepository extends BaseRepository<SongReleaseRecord & Record<string, unknown>> {
  constructor() { super("releaseRecords", "releaseId"); }
  async listPublic() { return (await this.list()).filter((release) => release.status === "published" && release.publicationState === "published" && release.publicVisibility); }
  async latestByArtist(artistId: string, limit = 3) { return (await this.listPublic()).filter((release) => release.artistId === artistId).sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, limit); }
  async findById(releaseId: string) { return this.get(releaseId); }
  async findBySlug(slug: string) { return this.findBy("slug", slug); }
  async existsBySlug(slug: string, excludeReleaseId?: string): Promise<boolean> {
    return (await this.list({ includeArchived: true })).some((release) => release.slug === slug && release.releaseId !== excludeReleaseId);
  }
  async listAdmin(filters: { artistId?: string; status?: string; query?: string; featured?: boolean } = {}) {
    const query = filters.query?.trim().toLowerCase();
    return (await this.list({ includeArchived: true }))
      .filter((release) => (filters.artistId ? release.artistId === filters.artistId : true))
      .filter((release) => (filters.status ? release.status === filters.status : true))
      .filter((release) => (filters.featured === undefined ? true : Boolean(release.featured) === filters.featured))
      .filter((release) => (query ? `${release.title} ${release.slug} ${release.genre} ${release.styleTags.join(" ")}`.toLowerCase().includes(query) : true))
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  }
  async countByStatus() {
    return (await this.list({ includeArchived: true })).reduce<Record<string, number>>((counts, release) => {
      counts[release.status] = (counts[release.status] ?? 0) + 1;
      return counts;
    }, {});
  }
  async countByArtist(artistId: string) {
    return (await this.list({ includeArchived: true })).filter((release) => release.artistId === artistId).length;
  }
  async softDeleteById(releaseId: string, actorId?: string, reason?: string) {
    return this.softDelete(releaseId, actorId, reason);
  }
}
export const releaseRepository = new ReleaseRepository();

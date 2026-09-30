import type { GalleryItemRecord } from "../models/gallery/GalleryItemModel";
import { BaseRepository } from "./BaseRepository";

export class GalleryRepository extends BaseRepository<GalleryItemRecord & Record<string, unknown>> {
  constructor() { super("galleryItems", "galleryItemId"); }

  findById(galleryItemId: string) { return this.get(galleryItemId); }

  findBySlug(slug: string) { return this.findBy("slug", slug); }

  async existsBySlug(slug: string, excludeGalleryItemId?: string): Promise<boolean> {
    return (await this.list({ includeArchived: true, includeDeleted: true }))
      .some((item) => item.slug === slug && item.galleryItemId !== excludeGalleryItemId);
  }

  async listAdmin(filters: { status?: string; sourceType?: string; mediaType?: string; search?: string; featured?: boolean } = {}) {
    const search = filters.search?.trim().toLowerCase();
    return (await this.list({ includeArchived: filters.status === "archived", sort: "sortOrder", direction: "asc" }))
      .filter((item) => !filters.status || filters.status === "all" || item.status === filters.status)
      .filter((item) => !filters.sourceType || item.sourceType === filters.sourceType)
      .filter((item) => !filters.mediaType || item.mediaType === filters.mediaType)
      .filter((item) => filters.featured === undefined || Boolean(item.metadata?.featured ?? item.publicVisibility) === filters.featured)
      .filter((item) => !search || [
        item.galleryItemId,
        item.title,
        item.slug,
        item.description,
        item.sourceId,
        item.artistId,
        item.releaseId,
        item.metadata?.caption,
        item.metadata?.credit,
        item.metadata?.altText,
      ].some((value) => String(value ?? "").toLowerCase().includes(search)));
  }

  async listPublic() {
    return (await this.list()).filter((item) =>
      item.status === "published" &&
      item.publicationState === "published" &&
      Boolean(item.publicVisibility) &&
      Boolean(item.imageUrl)
    );
  }

  async reorder(items: Array<{ galleryItemId: string; sortOrder: number }>) {
    const updated: GalleryItemRecord[] = [];
    for (const item of items) {
      const record = await this.update(item.galleryItemId, { sortOrder: item.sortOrder } as Partial<GalleryItemRecord & Record<string, unknown>>);
      if (record) updated.push(record);
    }
    return updated;
  }

  async countByStatus() {
    return (await this.list({ includeArchived: true })).reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {});
  }
}
export const galleryRepository = new GalleryRepository();

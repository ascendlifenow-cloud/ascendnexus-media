import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { contentLifecycleRepository } from "../../repositories/operations/OperationsRepository";
import { id, nowIso } from "./operationsShared";

export class ContentLifecycleService {
  async reconcileLifecycle() {
    const [artists, releases, gallery] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
      galleryRepository.list({ includeArchived: true }),
    ]);
    const existing = await contentLifecycleRepository.list({ includeArchived: true });
    const keys = new Set(existing.map((item) => `${item.entityType}:${item.entityId}`));
    const created = [];
    const create = async (entityType: string, entityId: string, status: string, publicationState?: string) => {
      const key = `${entityType}:${entityId}`;
      if (keys.has(key)) return;
      created.push(await contentLifecycleRepository.create({
        lifecycleId: id("lifecycle"),
        entityType,
        entityId,
        lifecycleStage: status === "published" && publicationState === "published" ? "published" : status === "archived" ? "archived" : "draft",
        healthStatus: "unknown",
        nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        recommendations: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: {},
        schemaVersion: 1,
      }));
    };
    for (const artist of artists) await create("artist", artist.artistId, artist.status, artist.publicationState);
    for (const release of releases) await create("release", release.releaseId, release.status, release.publicationState);
    for (const item of gallery) await create("gallery_item", item.galleryItemId, item.status, item.publicationState);
    return { created, total: (await contentLifecycleRepository.list({ includeArchived: true })).length, checkedAt: nowIso() };
  }

  listLifecycle() {
    return contentLifecycleRepository.list({ includeArchived: true, sort: "updatedAt", direction: "desc" });
  }
}

export const contentLifecycleService = new ContentLifecycleService();

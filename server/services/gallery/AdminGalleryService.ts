import type { PublicGalleryItem } from "../../../src/models/gallery";
import type { GalleryItemRecord } from "../../models/gallery/GalleryItemModel";
import { artistRepository } from "../../repositories/ArtistRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { mediaAssetRepository } from "../../repositories/MediaAssetRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { publicSafeUrl } from "../../mappers/public/publicUrlMapper";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { mediaLinkRepository } from "../../repositories/MediaLinkRepository";
import { mediaVersionRepository } from "../../repositories/MediaVersionRepository";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { gallerySlugService } from "./GallerySlugService";
import { galleryValidationService } from "./GalleryValidationService";

type GalleryPayload = Partial<PublicGalleryItem> & {
  featured?: boolean;
  caption?: string;
  credit?: string;
  decorative?: boolean;
  metadata?: Record<string, unknown>;
};

const nowIso = () => new Date().toISOString();
const asString = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;

const sanitizeMetadata = (metadata: Record<string, unknown> | undefined): Record<string, unknown> => {
  const next = { ...(metadata ?? {}) };
  delete next.privatePath;
  delete next.signedUrl;
  delete next.token;
  delete next.credentials;
  return next;
};

export class AdminGalleryService {
  async createGalleryItem(payload: GalleryPayload, actorId?: string): Promise<PublicGalleryItem> {
    const title = asString(payload.title) ?? "";
    const slug = payload.slug ? gallerySlugService.normalizeSlug(String(payload.slug)) : await gallerySlugService.suggestUniqueSlug(title);
    const unique = await gallerySlugService.ensureUniqueSlug(slug);
    if (!unique.valid) throw new MediaApiError("GALLERY_SLUG_CONFLICT", unique.errors.join(" "), 409, "validation");
    const sortOrder = Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : (await galleryRepository.list({ includeArchived: true })).length + 1;
    const source = await this.normalizeSource(payload);
    const metadata = sanitizeMetadata({
      ...(payload.metadata ?? {}),
      ...(payload.altText ? { altText: payload.altText } : {}),
      ...(payload.caption ? { caption: payload.caption } : {}),
      ...(payload.credit ? { credit: payload.credit } : {}),
      ...(payload.decorative !== undefined ? { decorative: Boolean(payload.decorative) } : {}),
      ...(payload.featured !== undefined ? { featured: Boolean(payload.featured) } : {}),
    });
    const record: GalleryItemRecord = {
      galleryItemId: payload.galleryItemId ?? `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      slug: unique.slug,
      description: asString(payload.description),
      imageUrl: asString(payload.imageUrl),
      thumbnailUrl: asString(payload.thumbnailUrl),
      mediaType: asString(payload.mediaType) ?? "image",
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      artistId: source.artistId,
      releaseId: source.releaseId,
      sortOrder,
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      metadata,
      schemaVersion: 1,
    };
    const validation = await galleryValidationService.buildValidationResult(record);
    if (Object.keys(validation.fieldErrors).length) throw new MediaApiError("GALLERY_VALIDATION_FAILED", Object.values(validation.fieldErrors).join(" "), 400, "validation");
    await galleryRepository.create(record as GalleryItemRecord & Record<string, unknown>);
    await mediaAuditPersistenceService.record("gallery_item_created", `Created gallery item "${record.title}"`, {
      actorId,
      entityType: "gallery_item",
      entityId: record.galleryItemId,
      entityLabel: record.title,
    });
    return this.sanitizeGalleryForAdmin(record);
  }

  async listGalleryItems(filters: { status?: string; sourceType?: string; mediaType?: string; search?: string; featured?: boolean } = {}) {
    return (await galleryRepository.listAdmin(filters)).map((record) => this.sanitizeGalleryForAdmin(record));
  }

  async getGalleryItem(galleryItemId: string): Promise<PublicGalleryItem | null> {
    const item = await galleryRepository.findById(galleryItemId);
    return item ? this.sanitizeGalleryForAdmin(item) : null;
  }

  async updateGalleryItem(galleryItemId: string, updates: GalleryPayload, actorId?: string): Promise<PublicGalleryItem | null> {
    const current = await galleryRepository.findById(galleryItemId);
    if (!current) return null;
    const protectedKeys = new Set(["galleryItemId", "createdAt", "createdBy", "status", "publicationState", "publicVisibility", "deletedAt", "deletedBy", "schemaVersion"]);
    const source = await this.normalizeSource({ ...current, ...updates });
    const patch: Partial<GalleryItemRecord> = {
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      artistId: source.artistId,
      releaseId: source.releaseId,
      updatedBy: actorId,
    };
    Object.entries(updates).forEach(([key, value]) => {
      if (protectedKeys.has(key)) return;
      if (["caption", "credit", "decorative", "featured", "altText", "metadata"].includes(key)) return;
      if (key in current) (patch as Record<string, unknown>)[key] = value;
    });
    if (updates.slug !== undefined) {
      const unique = await gallerySlugService.ensureUniqueSlug(String(updates.slug), galleryItemId);
      if (!unique.valid) throw new MediaApiError("GALLERY_SLUG_CONFLICT", unique.errors.join(" "), 409, "validation");
      patch.slug = unique.slug;
    }
    patch.metadata = sanitizeMetadata({
      ...(current.metadata ?? {}),
      ...(updates.metadata ?? {}),
      ...(updates.altText !== undefined ? { altText: updates.altText } : {}),
      ...(updates.caption !== undefined ? { caption: updates.caption } : {}),
      ...(updates.credit !== undefined ? { credit: updates.credit } : {}),
      ...(updates.decorative !== undefined ? { decorative: Boolean(updates.decorative) } : {}),
      ...(updates.featured !== undefined ? { featured: Boolean(updates.featured) } : {}),
      ...(current.publicationState === "published" ? { republishRequired: true } : {}),
    });
    if (current.publicationState === "published") patch.publicationState = "ready_to_publish";
    const next = { ...current, ...patch } as GalleryItemRecord;
    const validation = await galleryValidationService.buildValidationResult(next);
    if (Object.keys(validation.fieldErrors).length) throw new MediaApiError("GALLERY_VALIDATION_FAILED", Object.values(validation.fieldErrors).join(" "), 400, "validation");
    const updated = await galleryRepository.update(galleryItemId, patch as Partial<GalleryItemRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("gallery_item_updated", `Updated gallery item "${updated.title}"`, {
      actorId,
      entityType: "gallery_item",
      entityId: galleryItemId,
      entityLabel: updated.title,
      before: current,
      after: updated,
    });
    if (updated) this.invalidateGalleryCaches(updated.slug);
    return updated ? this.sanitizeGalleryForAdmin(updated) : null;
  }

  async getGalleryReadiness(galleryItemId: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    const validation = await galleryValidationService.buildValidationResult(item);
    return {
      galleryItemId,
      ready: validation.valid && validation.missingFields.length === 0,
      publicVisibility: item.publicVisibility ? "public" : "not_public",
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
      missingFields: validation.missingFields,
      fieldErrors: validation.fieldErrors,
      sourceState: item.sourceType,
      currentPublicationState: item.publicationState,
      checkedAt: validation.checkedAt,
    };
  }

  async publishGalleryItem(galleryItemId: string, actorId?: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    const readiness = await this.getGalleryReadiness(galleryItemId);
    if (!readiness?.ready) throw new MediaApiError("GALLERY_PUBLICATION_BLOCKED", [...(readiness?.blockingIssues ?? []), ...(readiness?.missingFields ?? [])].join(" ") || "Gallery item is not ready.", 400, "validation");
    const updated = await galleryRepository.update(galleryItemId, {
      status: "published",
      publicationState: "published",
      publicVisibility: true,
      metadata: { ...(item.metadata ?? {}), republishRequired: false, publishedAt: nowIso() },
      updatedBy: actorId,
    } as Partial<GalleryItemRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("gallery_item_published", `Published gallery item "${updated.title}"`, { actorId, entityType: "gallery_item", entityId: galleryItemId });
    this.invalidateGalleryCaches(item.slug);
    return updated ? this.sanitizeGalleryForAdmin(updated) : null;
  }

  async unpublishGalleryItem(galleryItemId: string, actorId?: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    const updated = await galleryRepository.update(galleryItemId, {
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      metadata: { ...(item.metadata ?? {}), unpublishedAt: nowIso() },
      updatedBy: actorId,
    } as Partial<GalleryItemRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("gallery_item_unpublished", `Unpublished gallery item "${updated.title}"`, { actorId, entityType: "gallery_item", entityId: galleryItemId });
    this.invalidateGalleryCaches(item.slug);
    return updated ? this.sanitizeGalleryForAdmin(updated) : null;
  }

  async archiveGalleryItem(galleryItemId: string, actorId?: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    const updated = await galleryRepository.update(galleryItemId, {
      status: "archived",
      publicationState: "archived",
      publicVisibility: false,
      archivedAt: nowIso(),
      archivedBy: actorId,
      metadata: { ...(item.metadata ?? {}), previousStatus: item.status, archivedAt: nowIso() },
      updatedBy: actorId,
    } as Partial<GalleryItemRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("gallery_item_archived", `Archived gallery item "${updated.title}"`, { actorId, entityType: "gallery_item", entityId: galleryItemId });
    this.invalidateGalleryCaches(item.slug);
    return updated ? this.sanitizeGalleryForAdmin(updated) : null;
  }

  async restoreGalleryItem(galleryItemId: string, actorId?: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    const updated = await galleryRepository.update(galleryItemId, {
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      archivedAt: undefined,
      archivedBy: undefined,
      metadata: { ...(item.metadata ?? {}), restoredAt: nowIso() },
      updatedBy: actorId,
    } as Partial<GalleryItemRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("gallery_item_restored", `Restored gallery item "${updated.title}"`, { actorId, entityType: "gallery_item", entityId: galleryItemId });
    this.invalidateGalleryCaches(item.slug);
    return updated ? this.sanitizeGalleryForAdmin(updated) : null;
  }

  async softDeleteGalleryItem(galleryItemId: string, actorId?: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    const updated = await galleryRepository.softDelete(galleryItemId, actorId, "Deleted through admin gallery lifecycle.");
    if (updated) await mediaAuditPersistenceService.record("gallery_item_soft_deleted", `Soft deleted gallery item "${updated.title}"`, { actorId, entityType: "gallery_item", entityId: galleryItemId });
    this.invalidateGalleryCaches(item.slug);
    return updated;
  }

  async reorderGalleryItems(items: Array<{ galleryItemId: string; sortOrder: number }>, actorId?: string) {
    if (!Array.isArray(items) || !items.length) throw new MediaApiError("GALLERY_REORDER_FAILED", "At least one gallery item is required for reorder.", 400, "validation");
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.galleryItemId || !Number.isFinite(Number(item.sortOrder))) throw new MediaApiError("GALLERY_REORDER_FAILED", "Each reorder item requires galleryItemId and numeric sortOrder.", 400, "validation");
      if (seen.has(item.galleryItemId)) throw new MediaApiError("GALLERY_REORDER_FAILED", "Duplicate gallery item IDs are not allowed in reorder.", 409, "validation");
      seen.add(item.galleryItemId);
      if (!await galleryRepository.findById(item.galleryItemId)) throw new MediaApiError("GALLERY_NOT_FOUND", `Gallery item ${item.galleryItemId} was not found.`, 404, "database");
    }
    const updated = await galleryRepository.reorder(items.map((item, index) => ({ galleryItemId: item.galleryItemId, sortOrder: Number(item.sortOrder) || index + 1 })));
    await mediaAuditPersistenceService.record("gallery_items_reordered", `Reordered ${updated.length} gallery items`, { actorId, entityType: "gallery_item" });
    this.invalidateGalleryCaches();
    return updated.map((item) => this.sanitizeGalleryForAdmin(item));
  }

  async getGalleryMedia(galleryItemId: string) {
    const links = await mediaLinkRepository.listByEntity("gallery_item", galleryItemId);
    const assets = await Promise.all(links.map((link) => mediaAssetRepository.get(link.assetId)));
    return assets.filter(Boolean);
  }

  async getGalleryVersions(galleryItemId: string) {
    const links = await mediaLinkRepository.listByEntity("gallery_item", galleryItemId);
    const versions = await Promise.all(links.map((link) => mediaVersionRepository.listByAsset(link.assetId)));
    return versions.flat();
  }

  async getGalleryDependencies(galleryItemId: string) {
    const item = await galleryRepository.findById(galleryItemId);
    if (!item) return null;
    return {
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      artistId: item.artistId,
      releaseId: item.releaseId,
      mediaLinks: await mediaLinkRepository.listByEntity("gallery_item", galleryItemId),
    };
  }

  sanitizeGalleryForAdmin(record: GalleryItemRecord): PublicGalleryItem {
    return {
      galleryItemId: record.galleryItemId,
      sourceType: record.sourceType as PublicGalleryItem["sourceType"],
      sourceId: record.sourceId ?? "",
      title: record.title,
      slug: record.slug,
      description: record.description,
      imageUrl: record.imageUrl,
      thumbnailUrl: record.thumbnailUrl,
      altText: typeof record.metadata?.altText === "string" ? record.metadata.altText : undefined,
      artistId: record.artistId,
      releaseId: record.releaseId,
      mediaType: record.mediaType as PublicGalleryItem["mediaType"],
      status: record.status === "deleted" ? "archived" : record.status,
      sortOrder: record.sortOrder,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      metadata: sanitizeMetadata({
        ...(record.metadata ?? {}),
        publicationState: record.publicationState,
        publicVisibility: record.publicVisibility,
      }) as PublicGalleryItem["metadata"],
    };
  }

  sanitizeGalleryForPublic(record: GalleryItemRecord): PublicGalleryItem | null {
    if (record.status !== "published" || record.publicationState !== "published" || !record.publicVisibility) return null;
    const imageUrl = publicSafeUrl(record.imageUrl);
    if (!imageUrl) return null;
    return {
      ...this.sanitizeGalleryForAdmin(record),
      imageUrl,
      thumbnailUrl: publicSafeUrl(record.thumbnailUrl),
      status: "published",
      metadata: undefined,
    };
  }

  private async normalizeSource(payload: Partial<PublicGalleryItem | GalleryItemRecord>) {
    const sourceType = asString(payload.sourceType) ?? "custom";
    if (sourceType === "artist") {
      const artistId = asString(payload.artistId) ?? asString(payload.sourceId);
      const artist = artistId ? await artistRepository.findById(artistId) : null;
      if (!artist || artist.status === "deleted") throw new MediaApiError("GALLERY_SOURCE_INVALID", "Artist source was not found.", 400, "validation");
      return { sourceType, sourceId: artist.artistId, artistId: artist.artistId, releaseId: undefined };
    }
    if (sourceType === "release") {
      const releaseId = asString(payload.releaseId) ?? asString(payload.sourceId);
      const release = releaseId ? await releaseRepository.findById(releaseId) : null;
      if (!release || release.status === "deleted") throw new MediaApiError("GALLERY_SOURCE_INVALID", "Release source was not found.", 400, "validation");
      return { sourceType, sourceId: release.releaseId, artistId: release.artistId, releaseId: release.releaseId };
    }
    return { sourceType, sourceId: asString(payload.sourceId) ?? `gallery-source-${Date.now()}`, artistId: asString(payload.artistId), releaseId: asString(payload.releaseId) };
  }

  private invalidateGalleryCaches(slug?: string) {
    publicContentCacheService.deleteByPattern("public:gallery");
    if (slug) publicContentCacheService.deleteByPattern(`public:gallery:${slug}`);
    publicContentCacheService.deleteByPattern("public:homepage");
    publicContentCacheService.deleteByPattern("public:search");
    publicContentCacheService.deleteByPattern("public:browse");
  }
}

export const adminGalleryService = new AdminGalleryService();

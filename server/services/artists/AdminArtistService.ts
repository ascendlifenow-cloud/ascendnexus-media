import type { ArtistRecord } from "../../models/artists/ArtistModel";
import { artistRepository } from "../../repositories/ArtistRepository";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { mediaStoragePromotionService } from "../media/MediaStoragePromotionService";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { artistSlugService } from "./ArtistSlugService";
import { artistValidationService } from "./ArtistValidationService";

type ArtistPayload = Partial<ArtistRecord> & {
  seoMetadata?: Record<string, unknown>;
  socialMetadata?: Record<string, unknown>;
  featuredSortOrder?: number;
};

const arrayOfStrings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))] : [];

const compactLinks = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, url]) => typeof url === "string" && url.trim()).map(([key, url]) => [key, String(url).trim()]));
};

const isPublicSafeUrl = (value: string | undefined): boolean =>
  Boolean(value && (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public")));

export class AdminArtistService {
  async createArtist(payload: ArtistPayload, actorId?: string): Promise<ArtistRecord> {
    const now = new Date().toISOString();
    const displayName = String(payload.displayName ?? payload.name ?? "").trim();
    const name = String(payload.name ?? displayName).trim();
    const slug = payload.slug ? artistSlugService.normalizeSlug(String(payload.slug)) : await artistSlugService.suggestUniqueSlug(displayName || name);
    const unique = await artistSlugService.ensureUniqueSlug(slug);
    if (!unique.valid) throw new MediaApiError("ARTIST_SLUG_CONFLICT", unique.errors.join(" "), 409, "validation");
    const artist: ArtistRecord = {
      artistId: `artist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      displayName,
      slug: unique.slug,
      shortBio: typeof payload.shortBio === "string" ? payload.shortBio.trim() : undefined,
      bio: typeof payload.bio === "string" ? payload.bio.trim() : "",
      status: "draft",
      genres: arrayOfStrings(payload.genres),
      styleTags: arrayOfStrings(payload.styleTags),
      profileImage: typeof payload.profileImage === "string" ? payload.profileImage.trim() : "",
      profileThumbnailUrl: typeof payload.profileThumbnailUrl === "string" ? payload.profileThumbnailUrl.trim() : undefined,
      profileBannerUrl: typeof payload.profileBannerUrl === "string" ? payload.profileBannerUrl.trim() : undefined,
      publicCharacterArtUrl: typeof payload.publicCharacterArtUrl === "string" ? payload.publicCharacterArtUrl.trim() : undefined,
      sortOrder: Number(payload.sortOrder ?? 100) || 100,
      featured: Boolean(payload.featured),
      externalLinks: compactLinks(payload.externalLinks),
      publicationState: "draft",
      publicVisibility: false,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
      metadata: {
        ...(payload.metadata ?? {}),
        seoMetadata: payload.seoMetadata ?? null,
        socialMetadata: payload.socialMetadata ?? null,
        featuredSortOrder: payload.featuredSortOrder ?? null,
      },
      schemaVersion: 1,
    };
    const validation = await artistValidationService.buildValidationResult(artist);
    if (Object.keys(validation.fieldErrors).length) throw new MediaApiError("ARTIST_VALIDATION_FAILED", Object.values(validation.fieldErrors).join(" "), 400, "validation");
    await artistRepository.create(artist as ArtistRecord & Record<string, unknown>);
    await mediaAuditPersistenceService.record("artist_created", `Created artist "${artist.displayName}"`, {
      actorId,
      entityType: "artist",
      entityId: artist.artistId,
      entityLabel: artist.displayName,
    });
    return this.sanitizeArtistForAdmin(artist);
  }

  async listArtists(filters: { status?: string; search?: string; featured?: boolean } = {}) {
    return (await artistRepository.listAdmin(filters)).map((artist) => this.sanitizeArtistForAdmin(artist));
  }

  async getArtist(artistId: string): Promise<ArtistRecord | null> {
    const artist = await artistRepository.findById(artistId);
    return artist ? this.sanitizeArtistForAdmin(artist) : null;
  }

  async updateArtist(artistId: string, updates: ArtistPayload, actorId?: string): Promise<ArtistRecord | null> {
    const current = await artistRepository.findById(artistId);
    if (!current) return null;
    const protectedKeys = new Set(["artistId", "createdAt", "createdBy", "publicationState", "publicVisibility", "deletedAt", "deletedBy", "schemaVersion"]);
    const patch: Partial<ArtistRecord> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (protectedKeys.has(key)) return;
      if (key in current) (patch as Record<string, unknown>)[key] = value;
    });
    if (updates.slug !== undefined) {
      const unique = await artistSlugService.ensureUniqueSlug(String(updates.slug), artistId);
      if (!unique.valid) throw new MediaApiError("ARTIST_SLUG_CONFLICT", unique.errors.join(" "), 409, "validation");
      patch.slug = unique.slug;
    }
    if (updates.genres !== undefined) patch.genres = arrayOfStrings(updates.genres);
    if (updates.styleTags !== undefined) patch.styleTags = arrayOfStrings(updates.styleTags);
    if (updates.externalLinks !== undefined) patch.externalLinks = compactLinks(updates.externalLinks);
    patch.updatedBy = actorId;
    patch.metadata = {
      ...(current.metadata ?? {}),
      ...(updates.metadata ?? {}),
      ...(updates.seoMetadata !== undefined ? { seoMetadata: updates.seoMetadata } : {}),
      ...(updates.socialMetadata !== undefined ? { socialMetadata: updates.socialMetadata } : {}),
      ...(updates.featuredSortOrder !== undefined ? { featuredSortOrder: updates.featuredSortOrder } : {}),
      ...(current.publicationState === "published" ? { republishRequired: true } : {}),
    };
    if (current.publicationState === "published") patch.publicationState = "ready_to_publish";
    const next = { ...current, ...patch } as ArtistRecord;
    const validation = await artistValidationService.buildValidationResult(next);
    if (Object.keys(validation.fieldErrors).length) throw new MediaApiError("ARTIST_VALIDATION_FAILED", Object.values(validation.fieldErrors).join(" "), 400, "validation");
    const updated = await artistRepository.update(artistId, patch as Partial<ArtistRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("artist_updated", `Updated artist "${updated.displayName}"`, {
      actorId,
      entityType: "artist",
      entityId: artistId,
      entityLabel: updated.displayName,
      before: current,
      after: updated,
    });
    return updated ? this.sanitizeArtistForAdmin(updated) : null;
  }

  async getArtistReadiness(artistId: string) {
    const artist = await artistRepository.findById(artistId);
    if (!artist) return null;
    const validation = await artistValidationService.buildValidationResult(artist);
    return {
      artistId,
      ready: validation.blockingIssues.length === 0 && validation.missingFields.filter((field) => field !== "profileImage").length === 0,
      publicVisibility: artist.publicVisibility ? "public" : "not_public",
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
      missingFields: validation.missingFields,
      fieldErrors: validation.fieldErrors,
      currentPublicationState: artist.publicationState,
      checkedAt: validation.checkedAt,
    };
  }

  async publishArtist(artistId: string, actorId?: string) {
    const artist = await artistRepository.findById(artistId);
    if (!artist) return null;
    const readiness = await this.getArtistReadiness(artistId);
    if (!readiness?.ready) throw new MediaApiError("ARTIST_PUBLICATION_BLOCKED", [...(readiness?.blockingIssues ?? []), ...(readiness?.missingFields ?? [])].join(" ") || "Artist is not ready.", 400, "validation");
    const promoted = await this.promoteArtistArtwork(artist, actorId);
    const updated = await artistRepository.update(artistId, {
      status: "active",
      publicationState: "published",
      publicVisibility: true,
      profileImage: promoted.profileImage ?? artist.profileImage,
      profileThumbnailUrl: promoted.profileThumbnailUrl ?? artist.profileThumbnailUrl,
      profileBannerUrl: promoted.profileBannerUrl ?? artist.profileBannerUrl,
      publicCharacterArtUrl: promoted.publicCharacterArtUrl ?? artist.publicCharacterArtUrl,
      metadata: { ...(artist.metadata ?? {}), republishRequired: false, publishedAt: new Date().toISOString() },
      updatedBy: actorId,
    } as Partial<ArtistRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("artist_published", `Published artist "${updated.displayName}"`, { actorId, entityType: "artist", entityId: artistId });
    this.invalidateArtistCaches(artist.slug);
    return updated ? this.sanitizeArtistForAdmin(updated) : null;
  }

  async unpublishArtist(artistId: string, actorId?: string) {
    const artist = await artistRepository.findById(artistId);
    if (!artist) return null;
    const updated = await artistRepository.update(artistId, {
      publicationState: "draft",
      publicVisibility: false,
      status: artist.status === "deleted" ? "deleted" : "draft",
      metadata: { ...(artist.metadata ?? {}), unpublishedAt: new Date().toISOString() },
      updatedBy: actorId,
    } as Partial<ArtistRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("artist_unpublished", `Unpublished artist "${updated.displayName}"`, { actorId, entityType: "artist", entityId: artistId });
    this.invalidateArtistCaches(artist.slug);
    return updated ? this.sanitizeArtistForAdmin(updated) : null;
  }

  async archiveArtist(artistId: string, actorId?: string) {
    const artist = await artistRepository.findById(artistId);
    if (!artist) return null;
    const updated = await artistRepository.update(artistId, {
      status: "archived",
      publicationState: "archived",
      publicVisibility: false,
      archivedAt: new Date().toISOString(),
      archivedBy: actorId,
      previousStatus: artist.status,
      metadata: { ...(artist.metadata ?? {}), archivedAt: new Date().toISOString() },
    } as Partial<ArtistRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("artist_archived", `Archived artist "${updated.displayName}"`, { actorId, entityType: "artist", entityId: artistId });
    this.invalidateArtistCaches(artist.slug);
    return updated ? this.sanitizeArtistForAdmin(updated) : null;
  }

  async restoreArtist(artistId: string, actorId?: string) {
    const artist = await artistRepository.findById(artistId);
    if (!artist) return null;
    const updated = await artistRepository.update(artistId, {
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      archivedAt: undefined,
      archivedBy: undefined,
      updatedBy: actorId,
      metadata: { ...(artist.metadata ?? {}), restoredAt: new Date().toISOString() },
    } as Partial<ArtistRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("artist_restored", `Restored artist "${updated.displayName}"`, { actorId, entityType: "artist", entityId: artistId });
    this.invalidateArtistCaches(artist.slug);
    return updated ? this.sanitizeArtistForAdmin(updated) : null;
  }

  async softDeleteArtist(artistId: string, actorId?: string) {
    const artist = await artistRepository.findById(artistId);
    if (!artist) return null;
    const updated = await artistRepository.softDelete(artistId, actorId, "Deleted through admin artist lifecycle.");
    if (updated) await mediaAuditPersistenceService.record("artist_soft_deleted", `Soft deleted artist "${updated.displayName}"`, { actorId, entityType: "artist", entityId: artistId });
    return updated;
  }

  async getArtistMedia(artistId: string) {
    const objects = await mediaStoragePersistenceService.list();
    return objects.filter((object) => object.assetId && object.metadata?.artistId === artistId);
  }

  sanitizeArtistForAdmin(record: ArtistRecord): ArtistRecord {
    return { ...record, profileImage: record.profileImage ?? "" };
  }

  sanitizeArtistForPublic(record: ArtistRecord) {
    return {
      artistId: record.artistId,
      name: record.name,
      slug: record.slug,
      displayName: record.displayName,
      bio: record.bio,
      shortBio: record.shortBio,
      profileImage: isPublicSafeUrl(record.profileImage) ? record.profileImage : "",
      profileThumbnailUrl: isPublicSafeUrl(record.profileThumbnailUrl) ? record.profileThumbnailUrl : undefined,
      profileBannerUrl: isPublicSafeUrl(record.profileBannerUrl) ? record.profileBannerUrl : undefined,
      publicCharacterArtUrl: isPublicSafeUrl(record.publicCharacterArtUrl) ? record.publicCharacterArtUrl : undefined,
      status: record.status,
      sortOrder: record.sortOrder,
      genres: record.genres,
      styleTags: record.styleTags,
      featured: record.featured,
      externalLinks: record.externalLinks,
      seoMetadata: record.metadata?.seoMetadata,
      socialMetadata: record.metadata?.socialMetadata,
    };
  }

  private async promoteArtistArtwork(artist: ArtistRecord, actorId?: string) {
    const result: Partial<Pick<ArtistRecord, "profileImage" | "profileThumbnailUrl" | "profileBannerUrl" | "publicCharacterArtUrl">> = {};
    const mappings: Array<[keyof typeof result, unknown]> = [
      ["profileImage", artist.metadata?.profileImageStorageObjectId],
      ["profileThumbnailUrl", artist.metadata?.profileThumbnailStorageObjectId],
      ["profileBannerUrl", artist.metadata?.profileBannerStorageObjectId],
      ["publicCharacterArtUrl", artist.metadata?.characterArtStorageObjectId],
    ];
    for (const [field, storageObjectId] of mappings) {
      if (typeof storageObjectId !== "string" || !storageObjectId) continue;
      try {
        const publicObject = await mediaStoragePromotionService.promoteStorageObjectToPublic(storageObjectId, { actorId, reason: `artist_${field}_publication` });
        const url = publicObject.publicUrl || String(publicObject.metadata?.publicCdnUrl ?? "");
        if (isPublicSafeUrl(url)) result[field] = url;
      } catch {
        // Optional artwork promotion should not crash if the original field is already public-safe.
      }
    }
    return result;
  }

  private invalidateArtistCaches(slug: string) {
    publicContentCacheService.deleteByPattern("public:artists");
    publicContentCacheService.deleteByPattern(`public:artist:${slug}`);
    publicContentCacheService.deleteByPattern("public:homepage");
    publicContentCacheService.deleteByPattern("public:search");
    publicContentCacheService.deleteByPattern("public:browse");
  }
}

export const adminArtistService = new AdminArtistService();

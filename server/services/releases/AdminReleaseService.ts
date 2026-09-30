import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";
import { mediaStoragePromotionService } from "../media/MediaStoragePromotionService";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { adminArtistService } from "../artists/AdminArtistService";
import { releaseSlugService } from "./ReleaseSlugService";
import { releaseValidationService } from "./ReleaseValidationService";

type ReleasePayload = Partial<SongReleaseRecord> & {
  seoMetadata?: Record<string, unknown>;
  socialMetadata?: Record<string, unknown>;
  featuredSortOrder?: number;
  featuredLabel?: string;
  featuredDescription?: string;
};

const arrayOfStrings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))] : [];

const compactLinks = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, url]) => typeof url === "string" && url.trim()).map(([key, url]) => [key, String(url).trim()]));
};

const isPublicSafeUrl = (value: string | undefined): boolean =>
  Boolean(value && (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public")));
const isPublicSafeOptionalUrl = (value: unknown): boolean =>
  value === undefined || value === null || value === "" || (typeof value === "string" && isPublicSafeUrl(value));

const isValidDate = (value: string | undefined): boolean => Boolean(value && Number.isFinite(Date.parse(value)));

const sanitizeReleaseMetadata = (metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!metadata) return undefined;
  const next = { ...metadata };
  delete next.fullSongUrl;
  delete next.fullSongPublicUrl;
  return next;
};

const mutableReleaseKeys = new Set([
  "title",
  "description",
  "lyrics",
  "releaseDate",
  "genre",
  "featured",
  "featuredPlacement",
  "coverArtUrl",
  "coverArtThumbnailUrl",
  "coverArtLargeUrl",
  "audioPreviewUrl",
  "sortOrder",
  "seoMetadataId",
  "socialMetadataId",
]);

export class AdminReleaseService {
  async createRelease(payload: ReleasePayload, actorId?: string): Promise<SongReleaseRecord> {
    const artist = payload.artistId ? await artistRepository.findById(String(payload.artistId)) : null;
    if (!artist || artist.status === "deleted") throw new MediaApiError("RELEASE_ARTIST_NOT_FOUND", "A valid artist is required before creating a release.", 400, "validation");
    const now = new Date().toISOString();
    const title = String(payload.title ?? "").trim();
    const slug = payload.slug ? releaseSlugService.normalizeSlug(String(payload.slug)) : await releaseSlugService.suggestUniqueSlug(title);
    const unique = await releaseSlugService.ensureUniqueSlug(slug);
    if (!unique.valid) throw new MediaApiError("RELEASE_SLUG_CONFLICT", unique.errors.join(" "), 409, "validation");
    const release: SongReleaseRecord = {
      releaseId: `release-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      songId: `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      artistId: String(payload.artistId),
      title,
      slug: unique.slug,
      description: typeof payload.description === "string" ? payload.description.trim() : undefined,
      lyrics: typeof payload.lyrics === "string" ? payload.lyrics : undefined,
      releaseDate: isValidDate(payload.releaseDate) ? String(payload.releaseDate) : now.slice(0, 10),
      genre: typeof payload.genre === "string" && payload.genre.trim() ? payload.genre.trim() : "Uncategorized",
      styleTags: arrayOfStrings(payload.styleTags),
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      featured: Boolean(payload.featured),
      featuredPlacement: typeof payload.featuredPlacement === "string" ? payload.featuredPlacement : undefined,
      coverArtUrl: typeof payload.coverArtUrl === "string" ? payload.coverArtUrl.trim() : undefined,
      coverArtThumbnailUrl: typeof payload.coverArtThumbnailUrl === "string" ? payload.coverArtThumbnailUrl.trim() : undefined,
      coverArtLargeUrl: typeof payload.coverArtLargeUrl === "string" ? payload.coverArtLargeUrl.trim() : undefined,
      audioPreviewUrl: typeof payload.audioPreviewUrl === "string" ? payload.audioPreviewUrl.trim() : undefined,
      externalLinks: compactLinks(payload.externalLinks),
      sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : undefined,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
      metadata: sanitizeReleaseMetadata({
        ...(payload.metadata ?? {}),
        seoMetadata: payload.seoMetadata ?? null,
        socialMetadata: payload.socialMetadata ?? null,
        featuredSortOrder: payload.featuredSortOrder ?? null,
        featuredLabel: payload.featuredLabel ?? null,
        featuredDescription: payload.featuredDescription ?? null,
      }),
      schemaVersion: 1,
    };
    const validation = await releaseValidationService.buildValidationResult(release);
    if (Object.keys(validation.fieldErrors).length) throw new MediaApiError("RELEASE_VALIDATION_FAILED", Object.values(validation.fieldErrors).join(" "), 400, "validation");
    await releaseRepository.create(release as SongReleaseRecord & Record<string, unknown>);
    await mediaAuditPersistenceService.record("release_created", `Created release "${release.title}"`, { actorId, entityType: "release", entityId: release.releaseId, entityLabel: release.title });
    return this.sanitizeReleaseForAdmin(release);
  }

  async listReleases(filters: { artistId?: string; status?: string; query?: string; featured?: boolean } = {}) {
    return (await releaseRepository.listAdmin(filters)).map((release) => this.sanitizeReleaseForAdmin(release));
  }

  async getRelease(releaseId: string): Promise<SongReleaseRecord | null> {
    const release = await releaseRepository.findById(releaseId);
    return release ? this.sanitizeReleaseForAdmin(release) : null;
  }

  async updateRelease(releaseId: string, updates: ReleasePayload, actorId?: string): Promise<SongReleaseRecord | null> {
    const current = await releaseRepository.findById(releaseId);
    if (!current) return null;
    const protectedKeys = new Set(["releaseId", "songId", "createdAt", "createdBy", "status", "publicationState", "publicVisibility", "deletedAt", "deletedBy", "schemaVersion"]);
    const patch: Partial<SongReleaseRecord> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (protectedKeys.has(key)) return;
      if (mutableReleaseKeys.has(key)) (patch as Record<string, unknown>)[key] = value;
    });
    if (updates.artistId !== undefined) {
      const artist = await artistRepository.findById(String(updates.artistId));
      if (!artist || artist.status === "deleted" || artist.status === "archived") throw new MediaApiError("RELEASE_ARTIST_NOT_FOUND", "Assigned artist is not available.", 400, "validation");
      patch.artistId = artist.artistId;
    }
    if (updates.slug !== undefined) {
      const unique = await releaseSlugService.ensureUniqueSlug(String(updates.slug), releaseId);
      if (!unique.valid) throw new MediaApiError("RELEASE_SLUG_CONFLICT", unique.errors.join(" "), 409, "validation");
      patch.slug = unique.slug;
    }
    if (updates.styleTags !== undefined) patch.styleTags = arrayOfStrings(updates.styleTags);
    if (updates.externalLinks !== undefined) patch.externalLinks = compactLinks(updates.externalLinks);
    if (updates.releaseDate !== undefined && !isValidDate(String(updates.releaseDate))) throw new MediaApiError("RELEASE_DATE_INVALID", "Release date must be valid.", 400, "validation");
    if (!isPublicSafeOptionalUrl(updates.coverArtUrl)) throw new MediaApiError("RELEASE_MEDIA_URL_INVALID", "Cover art URL must be public-safe.", 400, "validation");
    if (!isPublicSafeOptionalUrl(updates.audioPreviewUrl)) throw new MediaApiError("RELEASE_MEDIA_URL_INVALID", "Audio preview URL must be public-safe.", 400, "validation");
    patch.updatedBy = actorId;
    patch.metadata = sanitizeReleaseMetadata({
      ...(current.metadata ?? {}),
      ...(updates.metadata ?? {}),
      ...(updates.seoMetadata !== undefined ? { seoMetadata: updates.seoMetadata } : {}),
      ...(updates.socialMetadata !== undefined ? { socialMetadata: updates.socialMetadata } : {}),
      ...(updates.featuredSortOrder !== undefined ? { featuredSortOrder: updates.featuredSortOrder } : {}),
      ...(updates.featuredLabel !== undefined ? { featuredLabel: updates.featuredLabel } : {}),
      ...(updates.featuredDescription !== undefined ? { featuredDescription: updates.featuredDescription } : {}),
      ...(current.publicationState === "published" ? { republishRequired: true } : {}),
    });
    if (current.publicationState === "published") patch.publicationState = "ready_to_publish";
    const next = { ...current, ...patch } as SongReleaseRecord;
    const validation = await releaseValidationService.buildValidationResult(next, { strictPublicMedia: false });
    if (Object.keys(validation.fieldErrors).length) throw new MediaApiError("RELEASE_VALIDATION_FAILED", Object.values(validation.fieldErrors).join(" "), 400, "validation");
    const updated = await releaseRepository.update(releaseId, patch as Partial<SongReleaseRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("release_updated", `Updated release "${updated.title}"`, { actorId, entityType: "release", entityId: releaseId, entityLabel: updated.title, before: current, after: updated });
    return updated ? this.sanitizeReleaseForAdmin(updated) : null;
  }

  async getReleaseReadiness(releaseId: string) {
    const release = await releaseRepository.findById(releaseId);
    if (!release) return null;
    const validation = await releaseValidationService.buildValidationResult(release);
    return {
      releaseId,
      ready: validation.blockingIssues.length === 0 && validation.missingFields.length === 0 && Object.keys(validation.fieldErrors).length === 0,
      publicVisibility: release.publicVisibility ? "public" : "not_public",
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
      missingFields: validation.missingFields,
      fieldErrors: validation.fieldErrors,
      fullSongPrivacyState: validation.blockingIssues.some((issue) => issue.toLowerCase().includes("full-song")) ? "blocked" : "private",
      currentPublicationState: release.publicationState,
      checkedAt: validation.checkedAt,
    };
  }

  async publishRelease(releaseId: string, actorId?: string) {
    const release = await releaseRepository.findById(releaseId);
    if (!release) return null;
    await this.publishReadyArtistDependency(release, actorId);
    const readiness = await this.getReleaseReadiness(releaseId);
    if (!readiness?.ready) throw new MediaApiError("RELEASE_PUBLICATION_BLOCKED", [...(readiness?.blockingIssues ?? []), ...(readiness?.missingFields ?? [])].join(" ") || "Release is not ready.", 400, "validation");
    const promoted = await this.promoteReleaseMedia(release, actorId);
    const updated = await releaseRepository.update(releaseId, {
      status: "published",
      publicationState: "published",
      publicVisibility: true,
      coverArtUrl: promoted.coverArtUrl ?? release.coverArtUrl,
      coverArtThumbnailUrl: promoted.coverArtThumbnailUrl ?? release.coverArtThumbnailUrl,
      coverArtLargeUrl: promoted.coverArtLargeUrl ?? release.coverArtLargeUrl,
      audioPreviewUrl: promoted.audioPreviewUrl ?? release.audioPreviewUrl,
      metadata: { ...(release.metadata ?? {}), republishRequired: false, publishedAt: new Date().toISOString() },
      updatedBy: actorId,
    } as Partial<SongReleaseRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("release_published", `Published release "${updated.title}"`, { actorId, entityType: "release", entityId: releaseId });
    this.invalidateReleaseCaches(release);
    return updated ? this.sanitizeReleaseForAdmin(updated) : null;
  }

  private async publishReadyArtistDependency(release: SongReleaseRecord, actorId?: string): Promise<void> {
    if (!release.artistId) return;
    const artist = await artistRepository.findById(release.artistId);
    if (!artist) return;
    const artistCanBeRepublished =
      artist.status === "active" &&
      artist.publicVisibility === true &&
      artist.publicationState === "ready_to_publish";
    if (!artistCanBeRepublished) return;
    await adminArtistService.publishArtist(artist.artistId, actorId);
  }

  async unpublishRelease(releaseId: string, actorId?: string) {
    const release = await releaseRepository.findById(releaseId);
    if (!release) return null;
    const updated = await releaseRepository.update(releaseId, {
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      metadata: { ...(release.metadata ?? {}), unpublishedAt: new Date().toISOString() },
      updatedBy: actorId,
    } as Partial<SongReleaseRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("release_unpublished", `Unpublished release "${updated.title}"`, { actorId, entityType: "release", entityId: releaseId });
    this.invalidateReleaseCaches(release);
    return updated ? this.sanitizeReleaseForAdmin(updated) : null;
  }

  async archiveRelease(releaseId: string, actorId?: string) {
    const release = await releaseRepository.findById(releaseId);
    if (!release) return null;
    const updated = await releaseRepository.update(releaseId, {
      status: "archived",
      publicationState: "archived",
      publicVisibility: false,
      archivedAt: new Date().toISOString(),
      archivedBy: actorId,
      previousStatus: release.status,
      metadata: { ...(release.metadata ?? {}), archivedAt: new Date().toISOString() },
      updatedBy: actorId,
    } as Partial<SongReleaseRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("release_archived", `Archived release "${updated.title}"`, { actorId, entityType: "release", entityId: releaseId });
    this.invalidateReleaseCaches(release);
    return updated ? this.sanitizeReleaseForAdmin(updated) : null;
  }

  async restoreRelease(releaseId: string, actorId?: string) {
    const release = await releaseRepository.findById(releaseId);
    if (!release) return null;
    const updated = await releaseRepository.update(releaseId, {
      status: "draft",
      publicationState: "draft",
      publicVisibility: false,
      archivedAt: undefined,
      archivedBy: undefined,
      metadata: { ...(release.metadata ?? {}), restoredAt: new Date().toISOString() },
      updatedBy: actorId,
    } as Partial<SongReleaseRecord & Record<string, unknown>>);
    if (updated) await mediaAuditPersistenceService.record("release_restored", `Restored release "${updated.title}"`, { actorId, entityType: "release", entityId: releaseId });
    this.invalidateReleaseCaches(release);
    return updated ? this.sanitizeReleaseForAdmin(updated) : null;
  }

  async softDeleteRelease(releaseId: string, actorId?: string) {
    const release = await releaseRepository.findById(releaseId);
    if (!release) return null;
    const updated = await releaseRepository.softDeleteById(releaseId, actorId, "Deleted through admin release lifecycle.");
    if (updated) await mediaAuditPersistenceService.record("release_soft_deleted", `Soft deleted release "${updated.title}"`, { actorId, entityType: "release", entityId: releaseId });
    this.invalidateReleaseCaches(release);
    return updated;
  }

  async getReleaseMedia(releaseId: string) {
    const objects = await mediaStoragePersistenceService.list();
    return objects.filter((object) => object.assetId && object.metadata?.releaseId === releaseId);
  }

  sanitizeReleaseForAdmin(record: SongReleaseRecord): SongReleaseRecord {
    const metadata = { ...(record.metadata ?? {}) };
    delete metadata.fullSongUrl;
    delete metadata.fullSongPublicUrl;
    return { ...record, metadata };
  }

  sanitizeReleaseForPublic(record: SongReleaseRecord) {
    return {
      releaseId: record.releaseId,
      songId: record.songId,
      artistId: record.artistId,
      title: record.title,
      slug: record.slug,
      description: record.description,
      coverArtUrl: isPublicSafeUrl(record.coverArtUrl) ? record.coverArtUrl : undefined,
      coverArtThumbnailUrl: isPublicSafeUrl(record.coverArtThumbnailUrl) ? record.coverArtThumbnailUrl : undefined,
      coverArtLargeUrl: isPublicSafeUrl(record.coverArtLargeUrl) ? record.coverArtLargeUrl : undefined,
      audioPreviewUrl: isPublicSafeUrl(record.audioPreviewUrl) ? record.audioPreviewUrl : undefined,
      releaseDate: record.releaseDate,
      genre: record.genre,
      styleTags: record.styleTags,
      status: "published" as const,
      externalLinks: record.externalLinks,
      featured: record.featured,
      featuredSortOrder: typeof record.metadata?.featuredSortOrder === "number" ? record.metadata.featuredSortOrder : undefined,
      featuredLabel: typeof record.metadata?.featuredLabel === "string" ? record.metadata.featuredLabel : undefined,
      featuredDescription: typeof record.metadata?.featuredDescription === "string" ? record.metadata.featuredDescription : undefined,
      featuredPlacement: record.featuredPlacement as never,
      seoMetadata: record.metadata?.seoMetadata,
      socialMetadata: record.metadata?.socialMetadata,
    };
  }

  private async promoteReleaseMedia(release: SongReleaseRecord, actorId?: string) {
    const result: Partial<Pick<SongReleaseRecord, "coverArtUrl" | "coverArtThumbnailUrl" | "coverArtLargeUrl" | "audioPreviewUrl">> = {};
    const mappings: Array<[keyof typeof result, unknown]> = [
      ["coverArtUrl", release.metadata?.coverArtStorageObjectId],
      ["coverArtThumbnailUrl", release.metadata?.coverArtThumbnailStorageObjectId],
      ["coverArtLargeUrl", release.metadata?.coverArtLargeStorageObjectId],
      ["audioPreviewUrl", release.metadata?.audioPreviewStorageObjectId],
    ];
    for (const [field, storageObjectId] of mappings) {
      if (typeof storageObjectId !== "string" || !storageObjectId) continue;
      try {
        const publicObject = await mediaStoragePromotionService.promoteStorageObjectToPublic(storageObjectId, { actorId, reason: `release_${field}_publication` });
        const url = publicObject.publicUrl || String(publicObject.metadata?.publicCdnUrl ?? "");
        if (isPublicSafeUrl(url)) result[field] = url;
      } catch {
        // Optional media promotion must not expose private URLs or break existing public media.
      }
    }
    return result;
  }

  private invalidateReleaseCaches(release: SongReleaseRecord) {
    publicContentCacheService.deleteByPattern("public:releases");
    publicContentCacheService.deleteByPattern(`public:release:${release.slug}`);
    publicContentCacheService.deleteByPattern(`public:artist:${release.artistId}`);
    publicContentCacheService.deleteByPattern("public:homepage");
    publicContentCacheService.deleteByPattern("public:search");
    publicContentCacheService.deleteByPattern("public:browse");
  }
}

export const adminReleaseService = new AdminReleaseService();

export type PublicEntityType = "artist" | "release" | "gallery_item" | "homepage" | "site_config" | "metadata" | "media";

const text = (value: unknown) => typeof value === "string" ? value : "";
const bool = (value: unknown) => value === true || value === "public";

export class PublicContentVisibilityService {
  isEntityPublic(entityType: PublicEntityType, entity: Record<string, unknown> | null | undefined, source?: Record<string, unknown> | null): boolean {
    if (!entity) return false;
    if (entityType === "artist") return this.isArtistPublic(entity);
    if (entityType === "release") return this.isReleasePublic(entity, source);
    if (entityType === "gallery_item") return this.isGalleryItemPublic(entity, source);
    if (entityType === "homepage") return this.isHomepageVersionPublic(entity);
    if (entityType === "site_config") return this.isSiteConfigurationPublic(entity);
    if (entityType === "metadata") return this.isMetadataPublic(entity, source);
    if (entityType === "media") return this.isMediaPublic(entity);
    return false;
  }

  isArtistPublic(artist: Record<string, unknown>): boolean {
    return text(artist.status) === "active" && text(artist.publicationState) === "published" && bool(artist.publicVisibility) && !artist.archivedAt && !artist.deletedAt;
  }

  isReleasePublic(release: Record<string, unknown>, artist?: Record<string, unknown> | null): boolean {
    return text(release.status) === "published" &&
      text(release.publicationState) === "published" &&
      bool(release.publicVisibility) &&
      !release.archivedAt &&
      !release.deletedAt &&
      (!artist || this.isArtistPublic(artist));
  }

  isGalleryItemPublic(item: Record<string, unknown>, source?: Record<string, unknown> | null): boolean {
    return text(item.status) === "published" &&
      text(item.publicationState) === "published" &&
      bool(item.publicVisibility) &&
      !item.archivedAt &&
      !item.deletedAt &&
      (!source || bool(source.publicVisibility) || text(source.publicationState) === "published");
  }

  isHomepageVersionPublic(config: Record<string, unknown>): boolean {
    return text(config.status) === "published" && text(config.publicationState) === "published" && !config.archivedAt;
  }

  isSiteConfigurationPublic(config: Record<string, unknown>): boolean {
    return text(config.status) === "published" && text(config.publicationState) === "published" && !config.archivedAt;
  }

  isMetadataPublic(metadata: Record<string, unknown>, entity?: Record<string, unknown> | null): boolean {
    return text(metadata.status) === "published" &&
      text(metadata.publicationState) === "published" &&
      (!metadata.publicVisibility || text(metadata.publicVisibility) === "public") &&
      (!entity || bool(entity.publicVisibility) || text(entity.publicationState) === "published");
  }

  isMediaPublic(media: Record<string, unknown>): boolean {
    return text(media.status) === "published" && !String(media.url ?? "").includes("private") && !String(media.url ?? "").includes("signed");
  }

  assertPublicVisibility(entityType: PublicEntityType, entity: Record<string, unknown> | null | undefined): void {
    if (!this.isEntityPublic(entityType, entity)) throw new Error(`PUBLIC_CONTENT_NOT_PUBLISHED:${entityType}`);
  }

  buildVisibilityReport(entityType: PublicEntityType, entity: Record<string, unknown> | null | undefined) {
    return { entityType, public: this.isEntityPublic(entityType, entity), checkedAt: new Date().toISOString() };
  }
}

export const publicContentVisibilityService = new PublicContentVisibilityService();

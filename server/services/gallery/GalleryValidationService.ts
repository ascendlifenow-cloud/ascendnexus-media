import type { GalleryItemRecord } from "../../models/gallery/GalleryItemModel";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { publicSafeUrl } from "../../mappers/public/publicUrlMapper";
import { gallerySlugService } from "./GallerySlugService";

const allowedSourceTypes = new Set(["standalone", "artist", "release", "homepage", "site", "custom", "promo", "video"]);
const allowedMediaTypes = new Set(["image", "cover_art", "artist_profile", "promo_graphic", "video_thumbnail", "custom"]);

export class GalleryValidationService {
  async buildValidationResult(record: GalleryItemRecord) {
    const fieldErrors: Record<string, string> = {};
    const missingFields: string[] = [];
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!record.title?.trim()) {
      fieldErrors.title = "Title is required.";
      missingFields.push("title");
    }
    const slugErrors = gallerySlugService.validateSlug(record.slug);
    if (slugErrors.length) fieldErrors.slug = slugErrors.join(" ");
    if (!allowedSourceTypes.has(record.sourceType)) fieldErrors.sourceType = "Source type is not supported.";
    if (!allowedMediaTypes.has(record.mediaType)) fieldErrors.mediaType = "Gallery media type is not supported for production publishing.";

    if (record.sourceType === "artist") {
      if (!record.artistId || record.sourceId !== record.artistId) fieldErrors.sourceId = "Artist gallery items require matching sourceId and artistId.";
      const artist = record.artistId ? await artistRepository.findById(record.artistId) : null;
      if (!artist || artist.status === "deleted") blockingIssues.push("Linked artist is missing or deleted.");
      if (record.status === "published" && (!artist || artist.status !== "active" || artist.publicationState !== "published" || !artist.publicVisibility)) {
        blockingIssues.push("Artist-linked gallery items require an active published artist.");
      }
    }

    if (record.sourceType === "release") {
      if (!record.releaseId || record.sourceId !== record.releaseId) fieldErrors.sourceId = "Release gallery items require matching sourceId and releaseId.";
      const release = record.releaseId ? await releaseRepository.findById(record.releaseId) : null;
      if (!release || release.status === "deleted") blockingIssues.push("Linked release is missing or deleted.");
      if (record.status === "published" && (!release || release.status !== "published" || release.publicationState !== "published" || !release.publicVisibility)) {
        blockingIssues.push("Release-linked gallery items require a published release.");
      }
    }

    const publicImage = publicSafeUrl(record.imageUrl);
    if (record.status === "published" && !publicImage) {
      missingFields.push("public image");
      blockingIssues.push("Published gallery items require a public-safe image URL.");
    }
    const decorative = record.metadata?.decorative === true;
    const altText = typeof record.metadata?.altText === "string" ? record.metadata.altText : undefined;
    if (record.status === "published" && !decorative && !altText?.trim()) {
      missingFields.push("alt text");
      blockingIssues.push("Non-decorative gallery images require alt text before publishing.");
    }
    if (record.metadata?.mediaAssetId && typeof record.metadata.mediaAssetId !== "string") fieldErrors.mediaAssetId = "Media asset ID must be a string.";
    if (record.description && record.description.length > 10000) fieldErrors.description = "Description is too long.";
    if (typeof record.metadata?.caption === "string" && record.metadata.caption.length > 2000) fieldErrors.caption = "Caption is too long.";
    if (typeof record.metadata?.credit === "string" && record.metadata.credit.length > 500) fieldErrors.credit = "Credit is too long.";
    if (record.status !== "published" && record.imageUrl && !publicImage) warnings.push("Draft gallery media is not public-safe yet and will require promotion before publication.");

    return {
      valid: Object.keys(fieldErrors).length === 0 && blockingIssues.length === 0,
      blockingIssues,
      warnings,
      missingFields: [...new Set(missingFields)],
      fieldErrors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const galleryValidationService = new GalleryValidationService();

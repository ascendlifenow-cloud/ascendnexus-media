import type { ArtistRecord } from "../../models/artists/ArtistModel";
import { artistSlugService } from "./ArtistSlugService";
import { mediaProcessingRequirementService } from "../media/MediaProcessingRequirementService";

const safeUrl = (value: string | undefined): boolean => {
  if (!value) return true;
  if (/^(javascript|data:text|vbscript):/i.test(value)) return false;
  if (value.includes("..")) return false;
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/") || !value.includes(":");
};

export interface ArtistValidationResult {
  valid: boolean;
  blockingIssues: string[];
  warnings: string[];
  missingFields: string[];
  fieldErrors: Record<string, string>;
  checkedAt: string;
}

export class ArtistValidationService {
  async buildValidationResult(record: ArtistRecord): Promise<ArtistValidationResult> {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const fieldErrors: Record<string, string> = {};

    if (!record.name.trim()) missingFields.push("name");
    if (!record.displayName.trim()) missingFields.push("displayName");
    if (!record.slug.trim()) missingFields.push("slug");
    if (!record.bio.trim()) missingFields.push("bio");
    if (!record.profileImage?.trim()) warnings.push("Profile image is missing.");

    const slug = artistSlugService.validateSlug(record.slug);
    if (!slug.valid) fieldErrors.slug = slug.errors.join(" ");
    if (record.name.length > 200) fieldErrors.name = "Artist name must be 200 characters or less.";
    if (record.displayName.length > 200) fieldErrors.displayName = "Display name must be 200 characters or less.";
    if ((record.shortBio ?? "").length > 500) fieldErrors.shortBio = "Short bio must be 500 characters or less.";
    if (record.bio.length > 10_000) fieldErrors.bio = "Bio must be 10,000 characters or less.";
    if (record.genres.length > 20) fieldErrors.genres = "Too many genres.";
    if (record.styleTags.length > 30) fieldErrors.styleTags = "Too many style tags.";

    Object.entries(record.externalLinks ?? {}).forEach(([platform, url]) => {
      if (!safeUrl(url)) fieldErrors[`externalLinks.${platform}`] = "External link is not safe.";
    });
    ["profileImage", "profileThumbnailUrl", "profileBannerUrl", "publicCharacterArtUrl"].forEach((field) => {
      const value = record[field as keyof ArtistRecord];
      if (typeof value === "string" && !safeUrl(value)) fieldErrors[field] = "Artwork URL is not safe.";
    });

    if (record.status === "active" || record.publicationState === "ready_to_publish" || record.publicationState === "published") {
      missingFields.forEach((field) => blockingIssues.push(`${field} is required before publication.`));
      Object.values(fieldErrors).forEach((error) => blockingIssues.push(error));
    }

    const processingAssetIds = [
      record.metadata?.profileImageAssetId,
      record.metadata?.characterArtAssetId,
      record.metadata?.profileBannerAssetId,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    for (const assetId of processingAssetIds) {
      const readiness = await mediaProcessingRequirementService.buildPublicationProcessingReadiness(assetId).catch(() => null);
      if (readiness?.state === "required_processing_failed") blockingIssues.push(`Required processing failed for linked asset ${assetId}.`);
      if (readiness?.state === "processing_pending") warnings.push(`Processing is pending for linked asset ${assetId}.`);
    }

    return {
      valid: Object.keys(fieldErrors).length === 0 && blockingIssues.length === 0,
      blockingIssues,
      warnings,
      missingFields,
      fieldErrors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const artistValidationService = new ArtistValidationService();

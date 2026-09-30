import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseSlugService } from "./ReleaseSlugService";

export interface ReleaseValidationResult {
  valid: boolean;
  blockingIssues: string[];
  warnings: string[];
  missingFields: string[];
  fieldErrors: Record<string, string>;
  checkedAt: string;
}

export interface ReleaseValidationOptions {
  strictPublicMedia?: boolean;
}

const maxText = (value: string | undefined, limit: number): boolean => !value || value.length <= limit;
const isPublicSafeUrl = (value: string | undefined): boolean =>
  !value || value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public");
const isPrivateLeak = (value: unknown): boolean => typeof value === "string" && (value.includes("private/") || value.startsWith("blob:") || value.startsWith("data:"));
const isSafeExternalLink = (platform: string, url: string): boolean => {
  if (/^https:\/\//.test(url)) return true;
  return platform === "website" && url.startsWith("/") && !url.startsWith("//") && !url.includes("..");
};

export class ReleaseValidationService {
  async buildValidationResult(release: SongReleaseRecord, options: ReleaseValidationOptions = {}): Promise<ReleaseValidationResult> {
    const strictPublicMedia = options.strictPublicMedia ?? true;
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const fieldErrors: Record<string, string> = {};

    if (!release.artistId?.trim()) missingFields.push("artistId");
    if (!release.title?.trim()) missingFields.push("title");
    if (!release.slug?.trim()) missingFields.push("slug");
    if (!release.releaseDate?.trim()) missingFields.push("releaseDate");

    const slugErrors = releaseSlugService.validateSlug(release.slug);
    if (slugErrors.length) fieldErrors.slug = slugErrors.join(" ");

    const dateValue = Date.parse(release.releaseDate);
    if (!Number.isFinite(dateValue)) fieldErrors.releaseDate = "Release date must be a valid ISO date.";
    if (!maxText(release.title, 300)) fieldErrors.title = "Release title must be 300 characters or fewer.";
    if (!maxText(release.description, 10000)) fieldErrors.description = "Release description must be 10,000 characters or fewer.";
    if (!maxText(release.lyrics, 100000)) fieldErrors.lyrics = "Lyrics must be 100,000 characters or fewer.";
    if (release.styleTags.length > 24) fieldErrors.styleTags = "Use 24 style tags or fewer.";
    if (release.genre && release.genre.length > 120) fieldErrors.genre = "Genre must be 120 characters or fewer.";

    Object.entries(release.externalLinks ?? {}).forEach(([platform, url]) => {
      if (!url) return;
      if (!isSafeExternalLink(platform, url)) fieldErrors[`externalLinks.${platform}`] = "External links must use HTTPS, except website may use a safe internal path.";
    });

    if (!isPublicSafeUrl(release.coverArtUrl)) {
      if (strictPublicMedia) fieldErrors.coverArtUrl = "Cover art URL must be public-safe.";
      else warnings.push("Cover art URL is not public-safe and must be replaced before publication.");
    }
    if (!isPublicSafeUrl(release.audioPreviewUrl)) {
      if (strictPublicMedia) fieldErrors.audioPreviewUrl = "Audio preview URL must be public-safe.";
      else warnings.push("Audio preview URL is not public-safe and must be replaced before publication.");
    }
    if (isPrivateLeak(release.coverArtUrl) || isPrivateLeak(release.audioPreviewUrl)) blockingIssues.push("Public release media cannot expose private, blob, or data URLs.");
    if (isPrivateLeak(release.metadata?.fullSongUrl) || isPrivateLeak(release.metadata?.fullSongPublicUrl)) {
      blockingIssues.push("Full-song master cannot be stored in a public release URL field.");
    }

    if (release.artistId) {
      const artist = await artistRepository.findById(release.artistId);
      if (!artist) {
        blockingIssues.push("Assigned artist was not found.");
      } else if (artist.status === "deleted" || artist.status === "archived") {
        blockingIssues.push("Assigned artist is archived or deleted.");
      } else if (release.status === "published" || release.publicationState === "published") {
        if (artist.status !== "active" || artist.publicationState !== "published" || !artist.publicVisibility) {
          blockingIssues.push("Assigned artist must be active, published, and public before release publication.");
        }
      }
    }

    if (!release.coverArtUrl) warnings.push("Cover art is missing; public pages will use a fallback until artwork is linked and published.");
    if (!release.audioPreviewUrl) warnings.push("Audio preview is missing; public pages will show preview unavailable.");
    if (!release.metadata?.fullSongAssetId) warnings.push("Private full-song master is not linked yet.");

    return {
      valid: blockingIssues.length === 0 && missingFields.length === 0 && Object.keys(fieldErrors).length === 0,
      blockingIssues,
      warnings,
      missingFields,
      fieldErrors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const releaseValidationService = new ReleaseValidationService();

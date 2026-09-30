import { canonicalUrlService } from "./CanonicalUrlService";
import { robotsDirectiveService, type RobotsDirectives } from "./RobotsDirectiveService";

const unsafeUrlPatterns = ["private/", "token=", "signature=", "signed", "blob:", "data:", "fullSong", "full-song"];
const allowedOgTypes = new Set(["website", "profile", "music.song", "article"]);
const allowedTwitterCards = new Set(["summary", "summary_large_image"]);

export interface MetadataValidationInput {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  imageUrl?: string;
  robots?: RobotsDirectives;
  openGraphType?: string;
  twitterCard?: string;
  structuredData?: unknown;
  entityPublic?: boolean;
}

export class MetadataValidationService {
  isPublicSafeUrl(url: unknown) {
    if (!url) return true;
    if (typeof url !== "string") return false;
    return !unsafeUrlPatterns.some((pattern) => url.includes(pattern));
  }

  validate(input: MetadataValidationInput) {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const fieldErrors: Record<string, string> = {};

    if (!input.title?.trim()) {
      blockingIssues.push("Missing required metadata title.");
      fieldErrors.title = "Title is required.";
    } else {
      if (input.title.length < 10) warnings.push("Title is short.");
      if (input.title.length > 70) warnings.push("Title is longer than common search preview guidance.");
    }

    if (!input.description?.trim()) {
      blockingIssues.push("Missing required metadata description.");
      fieldErrors.description = "Description is required.";
    } else {
      if (input.description.length < 50) warnings.push("Description is short.");
      if (input.description.length > 180) warnings.push("Description is longer than common search preview guidance.");
    }

    if (input.canonicalUrl) {
      try {
        const normalized = canonicalUrlService.normalizeCanonicalUrl(input.canonicalUrl);
        if (!canonicalUrlService.isSameOriginCanonical(normalized)) {
          blockingIssues.push("Canonical URL must use the configured public site origin.");
          fieldErrors.canonicalUrl = "Canonical URL host mismatch.";
        }
      } catch {
        blockingIssues.push("Canonical URL is invalid.");
        fieldErrors.canonicalUrl = "Canonical URL is invalid.";
      }
    }

    if (!this.isPublicSafeUrl(input.imageUrl)) {
      blockingIssues.push("Social image URL is not public-safe.");
      fieldErrors.imageUrl = "Image URL cannot be private, signed, data/blob, or full-song related.";
    }

    if (input.openGraphType && !allowedOgTypes.has(input.openGraphType)) {
      blockingIssues.push("Open Graph type is unsupported.");
      fieldErrors.openGraphType = "Unsupported Open Graph type.";
    }

    if (input.twitterCard && !allowedTwitterCards.has(input.twitterCard)) {
      blockingIssues.push("X/Twitter card type is unsupported.");
      fieldErrors.twitterCard = "Unsupported X/Twitter card type.";
    }

    if (input.robots) {
      const robots = robotsDirectiveService.validate(input.robots);
      if (!robots.valid) {
        blockingIssues.push(...robots.errors);
        fieldErrors.robots = robots.errors.join(" ");
      }
    }

    if (input.entityPublic === false) blockingIssues.push("Entity metadata cannot publish before the entity is public.");

    return {
      valid: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      fieldErrors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const metadataValidationService = new MetadataValidationService();

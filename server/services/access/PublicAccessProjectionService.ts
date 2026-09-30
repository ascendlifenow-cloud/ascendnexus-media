import { publicResponseSafetyService } from "../public/PublicResponseSafetyService";

export class PublicAccessProjectionService {
  projectPublicContent<T>(content: T): T {
    return publicResponseSafetyService.sanitizeOptionalUnsafeFields(content);
  }

  projectGuestTeaser<T extends Record<string, unknown>>(content: T) {
    const allowed = new Set(["id", "releaseId", "artistId", "galleryItemId", "title", "slug", "description", "coverArtUrl", "thumbnailUrl", "imageUrl", "genre", "styleTags", "releaseDate", "access", "teaser"]);
    return Object.fromEntries(Object.entries(content).filter(([key]) => allowed.has(key))) as Partial<T>;
  }

  validatePublicProjection(dto: unknown) {
    return publicResponseSafetyService.buildSafetyReport(dto, { endpoint: "public_access_projection" });
  }
}

export const publicAccessProjectionService = new PublicAccessProjectionService();

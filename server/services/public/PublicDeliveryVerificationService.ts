import { publicContentDeliveryService } from "./PublicContentDeliveryService";
import { publicResponseSafetyService } from "./PublicResponseSafetyService";

export interface PublicDeliveryVerificationResult {
  success: boolean;
  checks: Array<{ name: string; success: boolean; details?: unknown }>;
  checkedAt: string;
}

export class PublicDeliveryVerificationService {
  async verifySite() {
    const data = await publicContentDeliveryService.getPublicSiteConfiguration();
    return this.verifyPayload("site", data);
  }

  async verifyHomepage() {
    const data = await publicContentDeliveryService.getPublicHomepage();
    return this.verifyPayload("homepage", data);
  }

  async verifyArtists() {
    const data = await publicContentDeliveryService.listPublicArtists();
    return this.verifyPayload("artists", data);
  }

  async verifyReleases() {
    const data = await publicContentDeliveryService.listPublicReleases();
    return this.verifyPayload("releases", data);
  }

  async verifyGallery() {
    const data = await publicContentDeliveryService.listPublicGalleryItems();
    return this.verifyPayload("gallery", data);
  }

  async verifyMetadata(path = "/") {
    const data = await publicContentDeliveryService.getPublicMetadataForPath(path);
    return this.verifyPayload(`metadata:${path}`, data);
  }

  async verifyHiddenContent(entityType: string, _entityId: string, slug: string) {
    const hidden =
      entityType === "artist" ? !(await publicContentDeliveryService.getPublicArtistBySlug(slug)) :
      entityType === "release" ? !(await publicContentDeliveryService.getPublicReleaseBySlug(slug)) :
      entityType === "gallery_item" ? !(await publicContentDeliveryService.getPublicGalleryItemBySlug(slug)) :
      true;
    return { name: `hidden:${entityType}:${slug}`, success: hidden };
  }

  async verifyPublicResponseSafety(endpoint: string, payload: unknown) {
    return this.verifyPayload(endpoint, payload);
  }

  async buildFullReport(): Promise<PublicDeliveryVerificationResult> {
    const checks = await Promise.all([
      this.verifySite(),
      this.verifyHomepage(),
      this.verifyArtists(),
      this.verifyReleases(),
      this.verifyGallery(),
      this.verifyMetadata("/"),
    ]);
    return {
      success: checks.every((check) => check.success),
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  private verifyPayload(name: string, payload: unknown) {
    const safety = publicResponseSafetyService.buildSafetyReport(payload, { endpoint: name });
    return { name, success: safety.safe && payload !== undefined && payload !== null, details: { safety } };
  }
}

export const publicDeliveryVerificationService = new PublicDeliveryVerificationService();

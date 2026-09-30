import { publicContentDeliveryService } from "./PublicContentDeliveryService";
import { publicExperienceValidationService } from "./PublicExperienceValidationService";
import { publicLandingService } from "./PublicLandingService";

export interface PublicExperienceHealth {
  status: "ok" | "degraded" | "blocked";
  publicContentAvailable: boolean;
  landingAvailable: boolean;
  publishedArtistCount: number;
  publishedReleaseCount: number;
  sectionStates: Array<{ key: string; enabled: boolean; itemCount: number }>;
  warnings: string[];
  blockingIssues: string[];
  checkedAt: string;
}

export class PublicExperienceHealthService {
  async buildHealth(): Promise<PublicExperienceHealth> {
    const [deliveryHealth, landing, validation] = await Promise.all([
      publicContentDeliveryService.buildPublicDeliveryHealth(),
      publicLandingService.getPublicLandingExperience(),
      publicExperienceValidationService.validateLandingExperience(),
    ]);
    const status: PublicExperienceHealth["status"] = validation.blockingIssues.length ? "blocked" : validation.warnings.length ? "degraded" : "ok";
    return {
      status,
      publicContentAvailable: Boolean(deliveryHealth.publicContentAvailable),
      landingAvailable: Boolean(landing.hero && landing.sectionStates.length),
      publishedArtistCount: deliveryHealth.publishedArtistCount,
      publishedReleaseCount: deliveryHealth.publishedReleaseCount,
      sectionStates: validation.sectionStates,
      warnings: validation.warnings,
      blockingIssues: validation.blockingIssues,
      checkedAt: validation.checkedAt,
    };
  }
}

export const publicExperienceHealthService = new PublicExperienceHealthService();

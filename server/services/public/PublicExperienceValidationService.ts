import { guestAccessPolicyService } from "./GuestAccessPolicyService";
import { publicLandingService } from "./PublicLandingService";

export interface PublicExperienceValidationResult {
  valid: boolean;
  blockingIssues: string[];
  warnings: string[];
  sectionStates: Array<{ key: string; enabled: boolean; itemCount: number }>;
  checkedAt: string;
}

export class PublicExperienceValidationService {
  async validateLandingExperience(): Promise<PublicExperienceValidationResult> {
    const landing = await publicLandingService.buildPublicLandingExperience();
    const report = guestAccessPolicyService.buildGuestAccessReport(landing);
    const blockingIssues = [
      ...report.forbiddenFields.map((field) => `Forbidden public field: ${field}`),
      ...report.privateUrls.map((field) => `Private URL exposure: ${field}`),
      ...report.signedUrls.map((field) => `Signed URL exposure: ${field}`),
      ...report.storagePaths.map((field) => `Storage path exposure: ${field}`),
      ...report.fullSongReferences.map((field) => `Full-song reference exposure: ${field}`),
      ...report.adminMetadata.map((field) => `Admin metadata exposure: ${field}`),
    ];
    const warnings: string[] = [];
    if (!landing.latestReleases.length) warnings.push("No published releases are available for the landing page.");
    if (!landing.featuredArtists.length) warnings.push("No published artists are available for the landing page.");
    if (!landing.guestPreviews.length) warnings.push("No public audio previews are available for guests.");
    if (landing.membershipTeaser.status === "readiness") warnings.push("Public member login/register pages are readiness screens until the member account backend is enabled.");

    return {
      valid: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      sectionStates: landing.sectionStates.map((section) => ({ key: section.key, enabled: section.enabled, itemCount: section.itemCount })),
      checkedAt: report.checkedAt,
    };
  }
}

export const publicExperienceValidationService = new PublicExperienceValidationService();

import { publicContactService } from "./PublicContactService";
import { publicFormAbuseProtectionService } from "./PublicFormAbuseProtectionService";
import { publicNewsletterService } from "./PublicNewsletterService";

export class PublicFormHealthService {
  async getHealthReport() {
    const [contact, newsletter] = await Promise.all([
      publicContactService.getHealth(),
      publicNewsletterService.getHealth(),
    ]);
    const rateLimiter = publicFormAbuseProtectionService.getHealth();
    const warnings: string[] = [];
    if (!contact.emailProviderAvailable) warnings.push("Email provider unavailable; contact notifications remain queued/failed until configured.");
    if (!newsletter.emailProviderAvailable) warnings.push("Email provider unavailable; newsletter confirmations remain queued/failed until configured.");
    return {
      contactOperational: contact.contactOperational,
      newsletterOperational: newsletter.newsletterOperational,
      databaseAvailable: true,
      emailProviderAvailable: contact.emailProviderAvailable || newsletter.emailProviderAvailable,
      emailQueueAvailable: true,
      emailWorkerAvailable: false,
      challengeAvailable: true,
      rateLimiterAvailable: rateLimiter.rateLimiterAvailable,
      templateStatus: "configured",
      pendingDeliveryCount: contact.pendingDeliveryCount + newsletter.pendingDeliveryCount,
      failedDeliveryCount: contact.failedDeliveryCount + newsletter.failedDeliveryCount,
      deadLetterCount: contact.deadLetterCount + newsletter.deadLetterCount,
      overallStatus: warnings.length ? "degraded" : "ok",
      warnings,
      errors: [],
      checkedAt: new Date().toISOString(),
    };
  }

  getPublicContactAvailability() {
    const availability = publicContactService.getAvailability();
    return {
      enabled: availability.enabled,
      operational: availability.operational,
      temporarilyUnavailable: availability.temporarilyUnavailable,
      retryAfter: availability.retryAfter,
    };
  }

  getPublicNewsletterAvailability() {
    const availability = publicNewsletterService.getAvailability();
    return {
      enabled: availability.enabled,
      operational: availability.operational,
      temporarilyUnavailable: availability.temporarilyUnavailable,
      newsletterOptInMode: availability.newsletterOptInMode,
    };
  }
}

export const publicFormHealthService = new PublicFormHealthService();

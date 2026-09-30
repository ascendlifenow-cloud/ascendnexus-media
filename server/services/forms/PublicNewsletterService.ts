import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import type { NewsletterSubscriptionRecord } from "../../models/newsletter/NewsletterSubscriptionModel";
import { newsletterRepository } from "../../repositories/NewsletterRepository";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { emailDeliveryService } from "../email/EmailDeliveryService";
import { publicFormAbuseProtectionService } from "./PublicFormAbuseProtectionService";
import { publicFormIdempotencyService } from "./PublicFormIdempotencyService";
import { publicFormNormalizationService } from "./PublicFormNormalizationService";
import { publicFormTokenService } from "./PublicFormTokenService";

export class PublicNewsletterService {
  getAvailability() {
    const config = getBackendConfig();
    const enabled = config.features.newsletterEnabled || config.email.newsletterEnabled;
    const emailConfigured = config.email.enabled && config.email.provider !== "disabled" && Boolean(config.email.fromAddress);
    return {
      enabled,
      operational: enabled,
      temporarilyUnavailable: !enabled,
      newsletterOptInMode: "double_opt_in" as const,
      emailDeliveryOperational: emailConfigured,
      consentRequired: true,
      challengeEnabled: false,
    };
  }

  async subscribe(payload: Record<string, unknown>, request: IncomingMessage) {
    const availability = this.getAvailability();
    if (!availability.enabled) throw createPublicError("FORM_FEATURE_DISABLED", "Newsletter is not available.", 503);
    const email = publicFormNormalizationService.normalizeEmail(payload.email);
    const displayName = publicFormNormalizationService.normalizeName(payload.displayName);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw createPublicError("FORM_VALIDATION_FAILED", "A valid email is required.", 400);
    if (!this.consentProvided(payload.consent)) throw createPublicError("FORM_VALIDATION_FAILED", "Consent is required.", 400);
    const abuse = publicFormAbuseProtectionService.evaluate("newsletter_subscription", request, payload, email);
    if (abuse.rateLimited) throw createPublicError("FORM_RATE_LIMITED", "Please wait before trying again.", 429);
    if (abuse.classification === "reject") throw createPublicError("FORM_SPAM_REJECTED", "Subscription request could not be accepted.", 400);
    const requestKeys = publicFormAbuseProtectionService.getRequestKey(request, email);
    const idempotencyKey = publicFormIdempotencyService.buildNewsletterKey({ email }, requestKeys.requestFingerprint, String(payload.idempotencyToken ?? ""));
    const existingResult = publicFormIdempotencyService.findExistingResult(idempotencyKey);
    if (existingResult) return existingResult;
    const now = new Date().toISOString();
    const normalizedEmail = email.toLowerCase();
    const existing = await newsletterRepository.findBy("normalizedEmail", normalizedEmail) as NewsletterSubscriptionRecord | null;
    if (existing?.status === "suppressed" || existing?.status === "complained") {
      return this.neutralResponse(availability);
    }
    const subscription = existing ?? await newsletterRepository.create({
      subscriptionId: `news_${randomUUID()}`,
      newsletterSubscriptionId: `news_${randomUUID()}`,
      email,
      normalizedEmail,
      displayName: displayName || undefined,
      status: "pending_confirmation",
      consentSource: "public_newsletter_form",
      consentTextVersion: "public-forms-v1",
      consent: this.buildConsent(payload.consent),
      sourcePage: String(payload.sourcePage ?? "/contact").slice(0, 160),
      sourceContext: publicFormNormalizationService.normalizeSourceContext(payload.sourceContext),
      preferences: typeof payload.preferences === "object" && payload.preferences ? payload.preferences as Record<string, unknown> : {},
      deliveryStatus: "pending",
      idempotencyKey,
      subscribedAt: now,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      schemaVersion: 2,
    } as NewsletterSubscriptionRecord & Record<string, unknown>) as NewsletterSubscriptionRecord;
    const token = await publicFormTokenService.createToken("newsletter_confirmation", subscription.subscriptionId, 7 * 24 * 60 * 60 * 1000);
    const unsubscribeToken = await publicFormTokenService.createToken("newsletter_unsubscribe", subscription.subscriptionId, 365 * 24 * 60 * 60 * 1000);
    await newsletterRepository.update(subscription.subscriptionId, {
      status: "pending_confirmation",
      confirmationTokenHash: token.tokenHash,
      unsubscribeTokenHash: unsubscribeToken.tokenHash,
      confirmation: { optInMode: "double_opt_in", tokenHash: token.tokenHash, expiresAt: token.record.expiresAt },
      unsubscribe: { tokenHash: unsubscribeToken.tokenHash },
      deliveryStatus: "queued",
      updatedAt: now,
    });
    await emailDeliveryService.queueDelivery({
      deliveryType: "newsletter_confirmation",
      templateKey: "newsletter_confirmation",
      recipientCategory: "subscriber",
      recipient: email,
      relatedEntityType: "newsletter_subscription",
      relatedEntityId: subscription.subscriptionId,
      metadata: {
        confirmationRequired: true,
        developmentTokenAvailable: !getBackendConfig().app.isProduction,
      },
    });
    void token;
    const result = this.neutralResponse(availability);
    publicFormIdempotencyService.storeResult(idempotencyKey, result);
    return result;
  }

  async confirm(token: string) {
    const consumed = await publicFormTokenService.consumeToken(token, "newsletter_confirmation");
    if (!consumed.valid) return { success: false, status: consumed.reason, message: "This confirmation link is invalid or expired." };
    const subscription = await newsletterRepository.get(consumed.record.relatedEntityId) as NewsletterSubscriptionRecord | null;
    if (!subscription) throw createPublicError("NEWSLETTER_SUBSCRIPTION_INVALID", "Subscription was not found.", 404);
    if (subscription.status === "subscribed" || subscription.status === "active") return { success: true, status: "already_confirmed", message: "Your subscription is already confirmed." };
    const now = new Date().toISOString();
    await newsletterRepository.update(subscription.subscriptionId, { status: "subscribed", confirmedAt: now, confirmation: { ...(subscription.confirmation ?? { optInMode: "double_opt_in" as const }), usedAt: now }, updatedAt: now });
    return { success: true, status: "confirmed", message: "Your newsletter subscription is confirmed." };
  }

  async unsubscribe(token: string) {
    const consumed = await publicFormTokenService.consumeToken(token, "newsletter_unsubscribe");
    if (!consumed.valid && consumed.reason !== "used") return { success: false, status: consumed.reason, message: "This unsubscribe link is invalid or expired." };
    const subscriptionId = consumed.record?.relatedEntityId;
    const subscription = subscriptionId ? await newsletterRepository.get(subscriptionId) as NewsletterSubscriptionRecord | null : null;
    if (!subscription) throw createPublicError("NEWSLETTER_SUBSCRIPTION_INVALID", "Subscription was not found.", 404);
    if (subscription.status === "unsubscribed") return { success: true, status: "already_unsubscribed", message: "This subscription is already unsubscribed." };
    const now = new Date().toISOString();
    await newsletterRepository.update(subscription.subscriptionId, { status: "unsubscribed", unsubscribedAt: now, unsubscribeReason: "public_token", unsubscribe: { ...(subscription.unsubscribe ?? {}), requestedAt: now, reason: "public_token" }, updatedAt: now });
    return { success: true, status: "unsubscribed", message: "You have been unsubscribed." };
  }

  async getHealth() {
    const [deliveries, subscriptions] = await Promise.all([emailDeliveryService.getHealth(), newsletterRepository.list({ includeArchived: true })]);
    return {
      newsletterOperational: this.getAvailability().operational,
      databaseAvailable: true,
      ...deliveries,
      subscriptionCount: subscriptions.length,
      pendingConfirmationCount: subscriptions.filter((item) => item.status === "pending_confirmation" || item.status === "pending").length,
      confirmedCount: subscriptions.filter((item) => item.status === "subscribed" || item.status === "active").length,
      checkedAt: new Date().toISOString(),
    };
  }

  private neutralResponse(availability = this.getAvailability(), extra: Record<string, unknown> = {}) {
    return {
      success: true,
      message: "If the address is eligible, a confirmation message will be sent.",
      confirmationRequired: true,
      retryable: false,
      availability,
      ...extra,
    };
  }

  private consentProvided(consent: unknown) {
    if (consent === true) return true;
    return Boolean(consent && typeof consent === "object" && (consent as Record<string, unknown>).consentProvided === true);
  }

  private buildConsent(consent: unknown) {
    return {
      consentRequired: true,
      consentProvided: this.consentProvided(consent),
      consentVersion: "public-forms-v1",
      consentTextKey: "newsletter_public_marketing_consent",
      newsletterMarketingConsent: true,
      providedAt: new Date().toISOString(),
      source: "public_newsletter_form",
      rawClientConsentIgnored: typeof consent,
    };
  }
}

export const publicNewsletterService = new PublicNewsletterService();

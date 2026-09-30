import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import { contactRepository } from "../../repositories/ContactRepository";
import { emailDeliveryService } from "../email/EmailDeliveryService";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { publicFormAbuseProtectionService } from "./PublicFormAbuseProtectionService";
import { publicFormIdempotencyService } from "./PublicFormIdempotencyService";
import { publicFormNormalizationService } from "./PublicFormNormalizationService";

export interface PublicContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  company?: unknown;
  phone?: unknown;
  preferredContactMethod?: unknown;
  consent?: unknown;
  sourceContext?: unknown;
  idempotencyToken?: unknown;
  website?: unknown;
  companyWebsite?: unknown;
  _contact_url?: unknown;
}

export class PublicContactService {
  getAvailability() {
    const config = getBackendConfig();
    const enabled = config.features.contactEnabled;
    const emailConfigured = config.email.enabled && config.email.provider !== "disabled" && config.email.contactNotificationRecipients.length > 0;
    return {
      enabled,
      operational: enabled,
      temporarilyUnavailable: !enabled,
      emailDeliveryOperational: emailConfigured,
      acknowledgementEnabled: false,
      consentRequired: true,
      challengeEnabled: false,
      retryAfter: undefined,
    };
  }

  async submitContact(payload: PublicContactPayload, request: IncomingMessage) {
    const availability = this.getAvailability();
    if (!availability.enabled) throw createPublicError("FORM_FEATURE_DISABLED", "Contact form is not available.", 503);
    const normalized = this.validateSubmission(payload);
    const requestKeys = publicFormAbuseProtectionService.getRequestKey(request, normalized.email);
    const assessment = publicFormAbuseProtectionService.evaluate("contact_inquiry", request, payload as Record<string, unknown>, normalized.email);
    if (assessment.rateLimited) throw createPublicError("FORM_RATE_LIMITED", "Please wait before submitting again.", 429);
    if (assessment.classification === "reject") throw createPublicError("FORM_SPAM_REJECTED", "Submission could not be accepted.", 400);
    const idempotencyKey = publicFormIdempotencyService.buildContactKey(normalized, requestKeys.requestFingerprint, String(payload.idempotencyToken ?? ""));
    const existing = publicFormIdempotencyService.findExistingResult(idempotencyKey);
    if (existing) return existing;
    const now = new Date().toISOString();
    const record = await contactRepository.create({
      contactSubmissionId: `contact_${randomUUID()}`,
      submissionType: "contact_inquiry",
      name: normalized.name,
      email: normalized.email,
      subject: normalized.subject,
      message: normalized.message,
      company: normalized.company,
      phone: normalized.phone,
      preferredContactMethod: normalized.preferredContactMethod,
      status: assessment.classification === "allow_with_flag" ? "reviewing" : "new",
      priority: "normal",
      sourcePath: normalized.sourcePage,
      sourcePage: normalized.sourcePage,
      sourceContext: normalized.sourceContext,
      consent: this.buildConsent(payload.consent),
      spamAssessment: assessment,
      deliveryStatus: "pending",
      notificationDeliveryIds: [],
      idempotencyKey,
      requestFingerprint: requestKeys.requestFingerprint,
      ipHash: requestKeys.ipHash,
      userAgentHash: requestKeys.userAgentHash,
      createdAt: now,
      updatedAt: now,
      metadata: { publicReference: this.publicReference(now) },
      schemaVersion: 2,
    });
    const deliveryIds: string[] = [];
    for (const recipient of getBackendConfig().email.contactNotificationRecipients) {
      const delivery = await emailDeliveryService.queueDelivery({
        deliveryType: "contact_admin_notification",
        templateKey: "contact_admin_notification",
        recipientCategory: "admin",
        recipient,
        relatedEntityType: "contact_submission",
        relatedEntityId: record.contactSubmissionId,
        metadata: { publicReference: record.metadata?.publicReference },
      });
      deliveryIds.push(delivery.emailDeliveryId);
    }
    const deliveryStatus = deliveryIds.length ? "queued" : "delayed";
    await contactRepository.update(record.contactSubmissionId, { notificationDeliveryIds: deliveryIds, deliveryStatus, emailNotificationStatus: deliveryStatus });
    const result = {
      success: true,
      submissionReference: record.metadata?.publicReference,
      message: deliveryStatus === "queued" ? "Your message was received." : "Your message was received. Notification delivery is pending operator configuration.",
      retryable: false,
      availability,
      deliveryState: deliveryStatus,
      requestId: record.contactSubmissionId.replace(/^contact_/, "ref_"),
    };
    publicFormIdempotencyService.storeResult(idempotencyKey, result);
    return result;
  }

  validateSubmission(payload: PublicContactPayload) {
    const name = publicFormNormalizationService.normalizeName(payload.name);
    const email = publicFormNormalizationService.normalizeEmail(payload.email);
    const subject = publicFormNormalizationService.normalizeSubject(payload.subject);
    const message = publicFormNormalizationService.normalizeMessage(payload.message);
    const company = publicFormNormalizationService.normalizeCompany(payload.company);
    const phone = publicFormNormalizationService.normalizePhone(payload.phone);
    const preferredContactMethod = publicFormNormalizationService.normalizeSubject(payload.preferredContactMethod);
    if (name.length < 2) throw createPublicError("FORM_VALIDATION_FAILED", "Name is required.", 400);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 320) throw createPublicError("FORM_VALIDATION_FAILED", "A valid email is required.", 400);
    if (message.length < 10) throw createPublicError("FORM_VALIDATION_FAILED", "Message is too short.", 400);
    if (message.length > 5000) throw createPublicError("FORM_VALIDATION_FAILED", "Message is too long.", 400);
    if (!this.consentProvided(payload.consent)) throw createPublicError("FORM_VALIDATION_FAILED", "Consent is required.", 400);
    return {
      name,
      email,
      subject: subject || undefined,
      message,
      company: company || undefined,
      phone: phone || undefined,
      preferredContactMethod: preferredContactMethod || undefined,
      sourcePage: "/contact",
      sourceContext: publicFormNormalizationService.normalizeSourceContext(payload.sourceContext),
    };
  }

  async getHealth() {
    const [deliveries, submissions] = await Promise.all([emailDeliveryService.getHealth(), contactRepository.list({ includeArchived: true })]);
    return {
      contactOperational: this.getAvailability().operational,
      databaseAvailable: true,
      ...deliveries,
      recentSubmissionCount: submissions.length,
      spamCount: submissions.filter((item) => item.status === "spam").length,
      checkedAt: new Date().toISOString(),
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
      consentTextKey: "contact_public_privacy_notice",
      providedAt: new Date().toISOString(),
      source: "public_contact_form",
      rawClientConsentIgnored: typeof consent,
    };
  }

  private publicReference(now: string) {
    return `ANM-${now.slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}

export const publicContactService = new PublicContactService();

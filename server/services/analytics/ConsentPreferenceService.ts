import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { ConsentCategory } from "../../models/analytics/ConsentPolicyModel";
import type { VisitorConsentRecord } from "../../models/analytics/VisitorConsentModel";
import { visitorConsentRepository } from "../../repositories/VisitorConsentRepository";
import { consentPolicyService } from "./ConsentPolicyService";

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
const nowIso = () => new Date().toISOString();

const hasGpc = (request: IncomingMessage) => String(request.headers["sec-gpc"] ?? "") === "1";
const hasDnt = (request: IncomingMessage) => ["1", "yes"].includes(String(request.headers.dnt ?? "").toLowerCase());

export class ConsentPreferenceService {
  async availability(request: IncomingMessage) {
    const policy = await consentPolicyService.getActivePolicy();
    return {
      enabled: true,
      consentRequired: true,
      policyVersion: policy.version,
      gpcDetected: hasGpc(request),
      dntDetected: hasDnt(request),
      privacyPath: policy.privacyPath,
      checkedAt: nowIso(),
    };
  }

  async recordConsent(payload: Record<string, unknown>, request: IncomingMessage): Promise<VisitorConsentRecord> {
    const policy = await consentPolicyService.getActivePolicy();
    const source = this.normalizeSource(payload.source);
    const gpcApplied = hasGpc(request) && policy.gpcPolicy === "honor_as_opt_out";
    const dntApplied = hasDnt(request) && policy.doNotTrackPolicy === "honor_as_opt_out";
    const choices = consentPolicyService.validateChoices(payload.choices);
    if (gpcApplied || dntApplied) {
      choices.analytics = false;
      choices.marketing = false;
    }
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + policy.expirationDays * 24 * 60 * 60 * 1000).toISOString();
    return visitorConsentRepository.create({
      visitorConsentId: createId("visitor_consent"),
      consentReference: createId("consent_ref"),
      policyVersion: policy.version,
      status: "active",
      choices,
      source,
      gpcApplied,
      dntApplied,
      userAgentHash: request.headers["user-agent"] ? hash(String(request.headers["user-agent"])) : undefined,
      clientHash: request.socket.remoteAddress ? hash(String(request.socket.remoteAddress)) : undefined,
      createdAt,
      updatedAt: createdAt,
      expiresAt,
      metadata: { serverTimestampAuthoritative: true },
      schemaVersion: 1,
    });
  }

  async withdraw(payload: Record<string, unknown>, request: IncomingMessage): Promise<VisitorConsentRecord> {
    const policy = await consentPolicyService.getActivePolicy();
    const reference = typeof payload.consentReference === "string" ? payload.consentReference : "";
    const existing = reference ? await visitorConsentRepository.findByReference(reference) : null;
    if (existing) {
      const updated = await visitorConsentRepository.update(existing.visitorConsentId, {
        status: "withdrawn",
        choices: { necessary: true, analytics: false, functional: false, marketing: false } as Record<ConsentCategory, boolean>,
        source: "withdrawal",
        withdrawnAt: nowIso(),
      });
      if (updated) return updated;
    }
    return this.recordConsent({ choices: { necessary: true }, source: "withdrawal", policyVersion: policy.version }, request);
  }

  toPublicConsent(record: VisitorConsentRecord) {
    return {
      consentReference: record.consentReference,
      policyVersion: record.policyVersion,
      status: record.status,
      choices: record.choices,
      source: record.source,
      gpcApplied: record.gpcApplied,
      dntApplied: record.dntApplied,
      expiresAt: record.expiresAt,
      updatedAt: record.updatedAt,
    };
  }

  private normalizeSource(source: unknown): VisitorConsentRecord["source"] {
    if (source === "preference_center" || source === "withdrawal" || source === "gpc" || source === "dnt") return source;
    return "banner";
  }
}

export const consentPreferenceService = new ConsentPreferenceService();

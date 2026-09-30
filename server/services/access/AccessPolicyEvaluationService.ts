import type { AccessDecision, ContentAccessClassification } from "../../models/membership/MembershipAccessModels";
import type { MemberAccountResponse } from "../../models/members/MemberModels";
import { effectiveEntitlementService, type EffectiveEntitlementSnapshot } from "./EffectiveEntitlementService";

const classificationEntitlements: Record<ContentAccessClassification, string[]> = {
  public: ["content.public.view"],
  guest_preview: ["audio.preview.basic"],
  registered_member: ["content.member.view"],
  free_member: ["content.free.view"],
  premium_member: ["content.premium.view"],
  supporter: ["content.supporter.view"],
  vip: ["content.vip.view"],
  staff_only: [],
  admin_only: [],
  embargoed: [],
  unlisted: ["content.member.view"],
  private: [],
};

export interface AccessSubject {
  type: "guest" | "member" | "admin";
  member?: MemberAccountResponse;
  adminPermissions?: string[];
}

export interface AccessResource {
  resourceType: string;
  resourceId?: string;
  action: string;
  accessClassification?: ContentAccessClassification;
  requiredEntitlements?: string[];
  embargoUntil?: string;
  startsAt?: string;
  endsAt?: string;
  publicationState?: string;
}

export class AccessPolicyEvaluationService {
  async evaluate(subject: AccessSubject, resource: AccessResource): Promise<AccessDecision> {
    const snapshot = subject.type === "member" && subject.member ? await effectiveEntitlementService.getForMember(subject.member) : await effectiveEntitlementService.getForGuest();
    if (subject.type === "admin" && subject.adminPermissions?.includes("admin.access")) return this.allow(subject, resource, snapshot, "ACCESS_ADMIN_RBAC_ALLOWED");
    if (subject.type === "member" && subject.member && (subject.member.status !== "Active" || !subject.member.emailVerified)) {
      return this.deny(subject, resource, snapshot, subject.member.emailVerified ? "ACCESS_ACCOUNT_INACTIVE" : "ACCESS_EMAIL_VERIFICATION_REQUIRED", subject.member.emailVerified ? "Account is not active." : "Email verification is required.", subject.member.emailVerified ? "challenge_reactivation" : "challenge_verification");
    }
    if (resource.publicationState && !["published", "public"].includes(resource.publicationState)) return this.deny(subject, resource, snapshot, "ACCESS_CONTENT_UNAVAILABLE", "Content is unavailable.", "not_available");
    if (resource.embargoUntil && Date.parse(resource.embargoUntil) > Date.now()) return this.deny(subject, resource, snapshot, "ACCESS_CONTENT_EMBARGOED", "Content is not available yet.", "embargoed");
    if (resource.startsAt && Date.parse(resource.startsAt) > Date.now()) return this.deny(subject, resource, snapshot, "ACCESS_EARLY_ACCESS_LOCKED", "Early access has not started.", "challenge_upgrade");
    if (resource.endsAt && Date.parse(resource.endsAt) <= Date.now()) return this.deny(subject, resource, snapshot, "ACCESS_GRANT_EXPIRED", "Access window has expired.", "expired");

    const required = resource.requiredEntitlements?.length ? resource.requiredEntitlements : classificationEntitlements[resource.accessClassification ?? "public"];
    if (!required.length) return this.deny(subject, resource, snapshot, "ACCESS_ENTITLEMENT_REQUIRED", "Access is not available.", "deny");
    const missing = required.filter((key) => !snapshot.allowed.includes(key));
    if (missing.length === 0) return this.allow(subject, resource, snapshot, "ACCESS_ENTITLEMENT_ALLOWED");
    if (subject.type === "guest") return this.deny(subject, resource, snapshot, "ACCESS_AUTHENTICATION_REQUIRED", "Sign in to continue.", "challenge_authentication", missing);
    return this.deny(subject, resource, snapshot, "ACCESS_TIER_REQUIRED", "Upgrade required for this content.", "challenge_upgrade", missing);
  }

  evaluateContentView(subject: AccessSubject, content: Omit<AccessResource, "action">) {
    return this.evaluate(subject, { ...content, action: "view" });
  }

  evaluateMediaStream(subject: AccessSubject, media: Omit<AccessResource, "action">) {
    return this.evaluate(subject, { ...media, action: "stream", requiredEntitlements: media.requiredEntitlements ?? ["audio.stream.full"] });
  }

  evaluateMediaDownload(subject: AccessSubject, media: Omit<AccessResource, "action">) {
    return this.evaluate(subject, { ...media, action: "download", requiredEntitlements: media.requiredEntitlements ?? ["audio.download"] });
  }

  evaluateFeature(subject: AccessSubject, featureKey: string) {
    const entitlement = featureKey === "favorites" ? "content.favorite" : featureKey === "following" ? "artist.follow" : featureKey === "playlists" ? "playlist.create" : featureKey === "notifications" ? "notifications.receive" : featureKey;
    return this.evaluate(subject, { resourceType: "feature", resourceId: featureKey, action: "use", requiredEntitlements: [entitlement] });
  }

  async getEffectiveEntitlements(subject: AccessSubject) {
    return subject.type === "member" && subject.member ? effectiveEntitlementService.getForMember(subject.member) : effectiveEntitlementService.getForGuest();
  }

  getHealth() {
    return { status: "ok", defaultDeny: true, checkedAt: new Date().toISOString() };
  }

  private allow(subject: AccessSubject, resource: AccessResource, snapshot: EffectiveEntitlementSnapshot, reasonCode: string): AccessDecision {
    return {
      allowed: true,
      decision: "allow",
      reasonCode,
      safeMessage: "Access allowed.",
      subjectType: subject.type,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      action: resource.action,
      matchedRuleIds: [reasonCode],
      effectiveEntitlements: snapshot.allowed,
      missingEntitlements: [],
      cacheable: subject.type !== "member",
      cacheScope: subject.type === "guest" ? "public" : "member_specific",
      auditRequired: ["stream", "download"].includes(resource.action),
      metadataSafe: { tierKey: snapshot.tierKey, authorizationVersion: snapshot.authorizationVersion },
    };
  }

  private deny(subject: AccessSubject, resource: AccessResource, snapshot: EffectiveEntitlementSnapshot, reasonCode: string, safeMessage: string, decision: AccessDecision["decision"], missingEntitlements: string[] = []): AccessDecision {
    return {
      allowed: false,
      decision,
      reasonCode,
      safeMessage,
      subjectType: subject.type,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      action: resource.action,
      matchedRuleIds: [reasonCode],
      effectiveEntitlements: snapshot.allowed,
      missingEntitlements,
      cacheable: true,
      cacheScope: subject.type === "guest" ? "guest_teaser" : "member_specific",
      auditRequired: ["stream", "download"].includes(resource.action) || reasonCode.includes("DENIED"),
      metadataSafe: { tierKey: snapshot.tierKey, authorizationVersion: snapshot.authorizationVersion },
    };
  }
}

export const accessPolicyEvaluationService = new AccessPolicyEvaluationService();

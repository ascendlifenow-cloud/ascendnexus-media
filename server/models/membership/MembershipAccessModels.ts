export type MembershipTierStatus = "draft" | "active" | "inactive" | "archived";
export type MembershipPlanStatus = "draft" | "active" | "inactive" | "archived";
export type MembershipBillingStatus = "not_configured" | "readiness_only" | "configured" | "active" | "paused";
export type EntitlementStatus = "draft" | "active" | "inactive" | "archived";
export type EntitlementEffect = "allow" | "deny";
export type MembershipAssignmentStatus = "pending" | "active" | "grace" | "suspended" | "expired" | "cancelled" | "revoked";
export type MembershipAssignmentSource = "registration_default" | "admin_grant" | "promotion" | "subscription" | "migration" | "partner" | "supporter" | "vip_invitation" | "system";
export type ContentAccessClassification = "public" | "guest_preview" | "registered_member" | "free_member" | "premium_member" | "supporter" | "vip" | "staff_only" | "admin_only" | "embargoed" | "unlisted" | "private";
export type AccessDecisionValue = "allow" | "deny" | "challenge_authentication" | "challenge_upgrade" | "challenge_verification" | "challenge_reactivation" | "not_available" | "embargoed" | "expired";
export type AccessCacheScope = "public" | "guest_teaser" | "member_shared_by_tier" | "member_specific" | "admin";

export interface MembershipTierRecord {
  tierId: string;
  tierKey: "guest" | "free" | "premium" | "supporter" | "vip";
  name: string;
  description: string;
  status: MembershipTierStatus;
  rank: number;
  isDefault: boolean;
  isPubliclyVisible: boolean;
  isPaidReady: boolean;
  isStaffTier: boolean;
  entitlementKeys: string[];
  featureFlags?: string[];
  displayMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  schemaVersion: number;
}

export interface MembershipPlanRecord {
  planId: string;
  planKey: string;
  name: string;
  description: string;
  tierId: string;
  status: MembershipPlanStatus;
  billingStatus: MembershipBillingStatus;
  billingProvider?: string;
  providerPriceId?: string;
  billingInterval?: string;
  priceDisplay?: string;
  currency?: string;
  trialDays?: number;
  gracePeriodDays?: number;
  isPubliclyVisible: boolean;
  startsAt?: string;
  endsAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface EntitlementDefinitionRecord {
  entitlementId: string;
  entitlementKey: string;
  name: string;
  description: string;
  category: "content" | "audio" | "video" | "gallery" | "download" | "engagement" | "playlist" | "notification" | "community" | "early_access" | "administrative_bridge" | "future";
  resourceTypes: string[];
  actions: string[];
  status: EntitlementStatus;
  defaultDeny: boolean;
  supportsConditions: boolean;
  supportsQuota: boolean;
  supportsTimeWindow: boolean;
  supportsContentOverride: boolean;
  publicDescription?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface TierEntitlementGrantRecord {
  tierEntitlementGrantId: string;
  tierId: string;
  entitlementKey: string;
  effect: EntitlementEffect;
  conditions?: Record<string, unknown>;
  quota?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  status: "active" | "inactive" | "expired" | "revoked";
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberMembershipAssignmentRecord {
  assignmentId: string;
  memberId: string;
  tierId: string;
  planId?: string;
  source: MembershipAssignmentSource;
  status: MembershipAssignmentStatus;
  startsAt: string;
  endsAt?: string;
  graceEndsAt?: string;
  cancelAt?: string;
  cancelledAt?: string;
  suspendedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberEntitlementGrantRecord {
  grantId: string;
  memberId: string;
  entitlementKey: string;
  effect: EntitlementEffect;
  source: "admin" | "promotion" | "campaign" | "support" | "subscription" | "system" | "migration" | "reward" | "invitation";
  resourceType?: string;
  resourceId?: string;
  conditions?: Record<string, unknown>;
  quota?: Record<string, unknown>;
  startsAt: string;
  endsAt?: string;
  status: "active" | "scheduled" | "expired" | "revoked" | "superseded";
  reason: string;
  createdBy?: string;
  revokedBy?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface AccessOverrideRecord {
  overrideId: string;
  scopeType: "global" | "content" | "artist" | "release" | "media" | "gallery" | "campaign" | "feature";
  scopeId: string;
  subjectType: "guest" | "tier" | "member" | "role" | "all_authenticated";
  subjectId: string;
  entitlementKey?: string;
  effect: EntitlementEffect;
  priority: number;
  startsAt: string;
  endsAt?: string;
  reason: string;
  status: "active" | "scheduled" | "expired" | "revoked";
  createdBy?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  schemaVersion: number;
}

export interface ContentAccessPolicyRecord {
  policyId: string;
  policyKey: string;
  name: string;
  description: string;
  status: "draft" | "published" | "archived";
  version: number;
  defaultEffect: "deny" | "allow_public";
  rules: AccessPolicyRule[];
  teaserPolicy: Record<string, unknown>;
  previewPolicy?: Record<string, unknown>;
  streamPolicy?: Record<string, unknown>;
  downloadPolicy?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface AccessPolicyRule {
  ruleId: string;
  priority: number;
  effect: EntitlementEffect;
  subjectConditions?: Record<string, unknown>;
  resourceConditions?: Record<string, unknown>;
  environmentConditions?: Record<string, unknown>;
  timeConditions?: Record<string, unknown>;
  requiredEntitlements: string[];
  requiredPermissions?: string[];
  requiredAccountStatus?: string[];
  requiredPublicationStatus?: string[];
  requiredMembershipStatus?: string[];
  quotaConditions?: Record<string, unknown>;
  reasonCode: string;
  enabled: boolean;
}

export interface ContentEntitlementRequirementRecord {
  requirementId: string;
  contentType: string;
  contentId: string;
  policyId: string;
  requiredEntitlementKeys: string[];
  requiredAnyEntitlementKeys?: string[];
  deniedEntitlementKeys?: string[];
  accessClassification: ContentAccessClassification;
  teaserEnabled: boolean;
  teaserFields: string[];
  previewAssetId?: string;
  downloadAssetId?: string;
  streamAssetId?: string;
  startsAt?: string;
  endsAt?: string;
  embargoUntil?: string;
  earlyAccessStartsAt?: string;
  publicReleaseAt?: string;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface AccessDecision {
  allowed: boolean;
  decision: AccessDecisionValue;
  reasonCode: string;
  safeMessage: string;
  subjectType: "guest" | "member" | "admin";
  resourceType: string;
  resourceId?: string;
  action: string;
  matchedPolicyId?: string;
  matchedRuleIds: string[];
  effectiveEntitlements: string[];
  missingEntitlements: string[];
  expiresAt?: string;
  cacheable: boolean;
  cacheScope: AccessCacheScope;
  auditRequired: boolean;
  metadataSafe: Record<string, unknown>;
}

export interface ProtectedMediaAuthorizationRecord {
  authorizationId: string;
  authorizationReference?: string;
  memberId: string;
  mediaId: string;
  mediaAssetId?: string;
  resourceType: string;
  resourceId: string;
  action: "stream" | "download";
  entitlementKey: string;
  accessPolicyVersion?: string;
  membershipVersion?: number;
  authorizationVersion?: number;
  deliveryMode?: "protected_gateway" | "signed_cdn_url" | "signed_cdn_cookie" | "direct_private_stream";
  issuedAt: string;
  expiresAt: string;
  status: "active" | "used" | "expired" | "revoked" | "denied";
  authorizationTokenHash?: string;
  sessionIdHash?: string;
  maxUses?: number;
  useCount: number;
  revokedAt?: string;
  revokeReason?: string;
  lastUsedAt?: string;
  requestContextHash?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface MemberAccessHistoryRecord {
  accessHistoryId: string;
  memberId?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  decision: AccessDecisionValue;
  reasonCode: string;
  entitlementKey?: string;
  policyVersion?: string;
  occurredAt: string;
  requestId?: string;
  sessionReferenceHash?: string;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

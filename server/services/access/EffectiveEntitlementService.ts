import type { MemberAccountResponse } from "../../models/members/MemberModels";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";

export interface EffectiveEntitlementSnapshot {
  subjectType: "guest" | "member";
  memberId?: string;
  tierKey: string;
  tierId?: string;
  status: "active" | "guest" | "inactive";
  allowed: string[];
  denied: string[];
  authorizationVersion: number;
  generatedAt: string;
}

function validWindow(startsAt: string | undefined, endsAt: string | undefined, requiredStart = false): boolean {
  startsAt = startsAt ?? undefined;
  endsAt = endsAt ?? undefined;
  return (!requiredStart || startsAt !== undefined)
    && (startsAt === undefined || Number.isFinite(Date.parse(startsAt)))
    && (endsAt === undefined || Number.isFinite(Date.parse(endsAt)))
    && (startsAt === undefined || endsAt === undefined || Date.parse(startsAt) < Date.parse(endsAt));
}

function inWindow(startsAt: string | undefined, endsAt: string | undefined, now: number): boolean {
  startsAt = startsAt ?? undefined;
  endsAt = endsAt ?? undefined;
  return (startsAt === undefined || Date.parse(startsAt) <= now)
    && (endsAt === undefined || Date.parse(endsAt) > now);
}

export function resolveMemberEntitlements(
  data: MediaDatabaseShape,
  memberId: string,
  resource?: { resourceType: string; resourceId: string },
  nowMs = Date.now(),
): EffectiveEntitlementSnapshot {
  const members = data.memberAccounts.filter((member) => member.memberId === memberId);
  const member = members.length === 1 ? members[0] : undefined;
  const validNow = Number.isFinite(nowMs) && Math.abs(nowMs) <= 8.64e15;
  const snapshot: EffectiveEntitlementSnapshot = {
    subjectType: "member", memberId, tierKey: "none", status: "inactive", allowed: [], denied: [],
    authorizationVersion: typeof member?.metadata?.authorizationVersion === "number" && Number.isSafeInteger(member.metadata.authorizationVersion) && member.metadata.authorizationVersion >= 0
      ? member.metadata.authorizationVersion : 1,
    generatedAt: new Date(validNow ? nowMs : 0).toISOString(),
  };
  if (!validNow || !member || member.status !== "Active" || member.emailVerified !== true) return snapshot;

  const assignments = data.memberMembershipAssignments.filter((item) => item.memberId === memberId);
  const active = assignments.filter((item) => item.status === "active");
  if (active.some((item) => !validWindow(item.startsAt, item.endsAt, true))) return snapshot;
  const current = active.filter((item) => inWindow(item.startsAt, item.endsAt, nowMs));
  if (current.length > 1) return snapshot;
  const latest = [...assignments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt))[0];
  if (!current.length && latest && ["suspended", "revoked"].includes(latest.status)) return snapshot;
  const tiers = current.length
    ? data.membershipTiers.filter((tier) => tier.tierId === current[0].tierId)
    : data.membershipTiers.filter((tier) => tier.tierKey === "free");
  const tier = tiers.length === 1 ? tiers[0] : undefined;
  if (!tier || tier.status !== "active" || tier.isStaffTier
    || !["free", "premium", "supporter", "vip"].includes(tier.tierKey)) return snapshot;

  const known = new Set(data.entitlementDefinitions
    .filter((definition) => definition.status === "active" && definition.category !== "administrative_bridge")
    .map((definition) => definition.entitlementKey));
  // A configured mapping replaces the legacy unconditional tier list for that key.
  const mappedKeys = new Set(data.tierEntitlementGrants.filter((grant) => grant.tierId === tier.tierId).map((grant) => grant.entitlementKey));
  const allowed = new Set(tier.entitlementKeys.filter((key) => known.has(key) && !mappedKeys.has(key)));
  const denied = new Set<string>();
  const grants = [
    ...data.tierEntitlementGrants.filter((grant) => grant.tierId === tier.tierId && grant.status === "active"),
    ...data.memberEntitlementGrants.filter((grant) => grant.memberId === memberId
      && (grant.status === "active" || grant.status === "scheduled")
      && (grant.resourceType == null && grant.resourceId == null
        || !!resource && grant.resourceType === resource.resourceType && grant.resourceId === resource.resourceId)),
  ];
  for (const grant of grants) {
    if (!known.has(grant.entitlementKey)) continue;
    if (!validWindow(grant.startsAt, grant.endsAt, "memberId" in grant)) return snapshot;
    if (!inWindow(grant.startsAt, grant.endsAt, nowMs)) continue;
    if (grant.effect === "deny") denied.add(grant.entitlementKey);
    // Conditions and quotas require a richer policy evaluator; they cannot authorize here.
    else if (grant.effect === "allow" && !Object.keys(grant.conditions ?? {}).length
      && !Object.keys(grant.quota ?? {}).length) allowed.add(grant.entitlementKey);
  }
  for (const key of denied) allowed.delete(key);
  return { ...snapshot, tierKey: tier.tierKey, tierId: tier.tierId, status: "active",
    allowed: [...allowed].sort(), denied: [...denied].sort() };
}

export class EffectiveEntitlementService {
  async getForGuest(): Promise<EffectiveEntitlementSnapshot> {
    return {
      subjectType: "guest",
      tierKey: "guest",
      status: "guest",
      allowed: ["audio.preview.basic", "content.public.view", "gallery.public.view", "video.public.view"],
      denied: [],
      authorizationVersion: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  async getForMember(member: MemberAccountResponse): Promise<EffectiveEntitlementSnapshot> {
    return resolveMemberEntitlements(await jsonDatabase.read(), member.memberId);
  }
}

export const effectiveEntitlementService = new EffectiveEntitlementService();

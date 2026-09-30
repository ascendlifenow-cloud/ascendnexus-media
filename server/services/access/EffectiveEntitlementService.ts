import type { MemberAccountResponse } from "../../models/members/MemberModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { membershipAssignmentService } from "../membership/MembershipAssignmentService";
import { membershipCatalogService } from "../membership/MembershipCatalogService";

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

export class EffectiveEntitlementService {
  async getForGuest(): Promise<EffectiveEntitlementSnapshot> {
    const tier = await membershipCatalogService.getTierByKey("guest");
    return {
      subjectType: "guest",
      tierKey: "guest",
      tierId: tier?.tierId,
      status: "guest",
      allowed: tier?.entitlementKeys ?? ["content.public.view", "audio.preview.basic"],
      denied: [],
      authorizationVersion: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  async getForMember(member: MemberAccountResponse): Promise<EffectiveEntitlementSnapshot> {
    if (member.status !== "Active" || !member.emailVerified) {
      return { subjectType: "member", memberId: member.memberId, tierKey: "none", status: "inactive", allowed: [], denied: [], authorizationVersion: this.versionFromMember(member), generatedAt: new Date().toISOString() };
    }
    const current = await membershipAssignmentService.getCurrentMembership(member.memberId);
    const allowed = new Set<string>();
    const denied = new Set<string>();
    if (current?.tier) current.tier.entitlementKeys.forEach((key) => allowed.add(key));
    const data = await jsonDatabase.read();
    for (const grant of data.memberEntitlementGrants) {
      if (grant.memberId !== member.memberId) continue;
      if (!["active", "scheduled"].includes(grant.status)) continue;
      if (grant.startsAt && Date.parse(grant.startsAt) > Date.now()) continue;
      if (grant.endsAt && Date.parse(grant.endsAt) <= Date.now()) continue;
      if (grant.effect === "deny") {
        denied.add(grant.entitlementKey);
        allowed.delete(grant.entitlementKey);
      } else if (!denied.has(grant.entitlementKey)) {
        allowed.add(grant.entitlementKey);
      }
    }
    return {
      subjectType: "member",
      memberId: member.memberId,
      tierKey: current?.tier.tierKey ?? "free",
      tierId: current?.tier.tierId,
      status: current?.assignment?.status === "active" || current?.tier ? "active" : "inactive",
      allowed: Array.from(allowed).sort(),
      denied: Array.from(denied).sort(),
      authorizationVersion: this.versionFromMember(member),
      generatedAt: new Date().toISOString(),
    };
  }

  private versionFromMember(member: MemberAccountResponse) {
    return typeof member.authorizationVersion === "number" ? member.authorizationVersion : 1;
  }
}

export const effectiveEntitlementService = new EffectiveEntitlementService();

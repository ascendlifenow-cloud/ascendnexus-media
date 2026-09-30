import type { MemberMembershipAssignmentRecord, MembershipAssignmentSource } from "../../models/membership/MembershipAccessModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { membershipCatalogService } from "./MembershipCatalogService";

export class MembershipAssignmentService {
  async assignDefaultFreeTier(memberId: string) {
    const tier = await membershipCatalogService.getDefaultFreeTier();
    if (!tier) throw new Error("Default free membership tier is not configured.");
    return this.assignTier(memberId, tier.tierId, "registration_default", "system");
  }

  async assignTier(memberId: string, tierId: string, source: MembershipAssignmentSource = "admin_grant", actorId = "system", endsAt?: string) {
    const now = new Date().toISOString();
    let assignment: MemberMembershipAssignmentRecord | undefined;
    await jsonDatabase.update((data) => {
      for (const existing of data.memberMembershipAssignments) {
        if (existing.memberId === memberId && existing.status === "active") {
          existing.status = "revoked";
          existing.updatedAt = now;
        }
      }
      assignment = {
        assignmentId: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        memberId,
        tierId,
        source,
        status: "active",
        startsAt: now,
        endsAt,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      };
      data.memberMembershipAssignments.push(assignment);
      const member = data.memberAccounts.find((item) => item.memberId === memberId);
      const tier = data.membershipTiers.find((item) => item.tierId === tierId);
      if (member && tier) {
        member.membershipTier = tier.name as never;
        member.updatedAt = now;
        member.metadata = { ...(member.metadata ?? {}), authorizationVersion: this.nextVersion(member.metadata?.authorizationVersion) };
      }
    });
    await mediaAuditPersistenceService.record("member_tier_assigned", `Assigned member tier ${tierId}.`, { actorId, entityType: "member_account", entityId: memberId, metadata: { tierId, source } });
    return assignment!;
  }

  async suspendMembership(memberId: string, reason: string, actorId = "system") {
    await this.updateActive(memberId, "suspended");
    await mediaAuditPersistenceService.record("member_tier_suspended", reason, { actorId, entityType: "member_account", entityId: memberId });
  }

  async revokeMembership(memberId: string, reason: string, actorId = "system") {
    await this.updateActive(memberId, "revoked");
    await mediaAuditPersistenceService.record("member_tier_revoked", reason, { actorId, entityType: "member_account", entityId: memberId });
  }

  async getCurrentMembership(memberId: string) {
    const catalog = await membershipCatalogService.getCatalog();
    const data = await jsonDatabase.read();
    const assignment = data.memberMembershipAssignments.find((item) => item.memberId === memberId && item.status === "active" && (!item.endsAt || Date.parse(item.endsAt) > Date.now()));
    const tier = assignment ? catalog.tiers.find((item) => item.tierId === assignment.tierId) : await membershipCatalogService.getDefaultFreeTier();
    return assignment && tier ? { assignment, tier } : tier ? { assignment: undefined, tier } : undefined;
  }

  async getMembershipHistory(memberId: string) {
    const data = await jsonDatabase.read();
    return data.memberMembershipAssignments.filter((item) => item.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async updateActive(memberId: string, status: MemberMembershipAssignmentRecord["status"]) {
    const now = new Date().toISOString();
    await jsonDatabase.update((data) => {
      for (const item of data.memberMembershipAssignments) {
        if (item.memberId === memberId && item.status === "active") {
          item.status = status;
          item.updatedAt = now;
        }
      }
      const member = data.memberAccounts.find((item) => item.memberId === memberId);
      if (member) member.metadata = { ...(member.metadata ?? {}), authorizationVersion: this.nextVersion(member.metadata?.authorizationVersion) };
    });
  }

  private nextVersion(value: unknown) {
    return typeof value === "number" ? value + 1 : 1;
  }
}

export const membershipAssignmentService = new MembershipAssignmentService();

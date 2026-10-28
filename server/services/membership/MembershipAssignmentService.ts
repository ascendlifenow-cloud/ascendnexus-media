import type { MemberMembershipAssignmentRecord, MembershipAssignmentSource } from "../../models/membership/MembershipAccessModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { membershipCatalogService } from "./MembershipCatalogService";
import { AuthApiError } from "../../utils/auth/authErrorUtils";

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
      const member = data.memberAccounts.find((item) => item.memberId === memberId);
      const tier = data.membershipTiers.find((item) => item.tierId === tierId);
      if (!member || member.status === "Deleted") throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      if (!tier || tier.status !== "active" || tier.isStaffTier || !["free", "premium", "supporter", "vip"].includes(tier.tierKey)) throw new AuthApiError("MEMBER_TIER_INVALID", "Select an active consumer membership tier.", 400);
      if (source === "registration_default" && tier.tierKey !== "free") throw new AuthApiError("MEMBER_TIER_INVALID", "Registration must start with free membership.", 400);
      if (endsAt !== undefined && (!Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.now())) throw new AuthApiError("MEMBER_TIER_EXPIRATION_INVALID", "Membership expiration must be a valid future date.", 400);
      for (const existing of data.memberMembershipAssignments) {
        if (existing.memberId === memberId && ["active", "grace", "suspended"].includes(existing.status)) {
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
      if (member && tier) {
        member.membershipTier = tier.name as never;
        member.updatedAt = now;
        member.metadata = { ...(member.metadata ?? {}), authorizationVersion: this.nextVersion(member.metadata?.authorizationVersion) };
      }
      this.revokeMedia(data, memberId, now);
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
    const [catalog, assignments] = await Promise.all([
      membershipCatalogService.getCatalog(),
      jsonDatabase.listCollection("memberMembershipAssignments"),
    ]);
    const assignment = assignments.find((item) => item.memberId === memberId && item.status === "active" && Date.parse(item.startsAt) <= Date.now() && (!item.endsAt || Date.parse(item.endsAt) > Date.now()));
    const tier = assignment ? catalog.tiers.find((item) => item.tierId === assignment.tierId && item.status === "active" && !item.isStaffTier && item.tierKey !== "guest") : await membershipCatalogService.getDefaultFreeTier();
    return assignment && tier ? { assignment, tier } : tier ? { assignment: undefined, tier } : undefined;
  }

  async getMembershipHistory(memberId: string) {
    const assignments = await jsonDatabase.listCollection("memberMembershipAssignments");
    return assignments.filter((item) => item.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      this.revokeMedia(data, memberId, now);
    });
  }

  private revokeMedia(data: import("../media/JsonDatabase").MediaDatabaseShape, memberId: string, now: string) {
    for (const authorization of data.protectedMediaAuthorizations) {
      if (authorization.memberId === memberId && authorization.status === "active") {
        authorization.status = "revoked";
        authorization.revokedAt = now;
        authorization.revokeReason = "Membership changed";
      }
    }
    for (const playback of data.protectedPlaybackSessions) {
      if (playback.memberId === memberId && ["authorized", "starting", "playing", "paused"].includes(playback.status)) {
        playback.status = "revoked";
        playback.endedAt = now;
      }
    }
  }

  private nextVersion(value: unknown) {
    return typeof value === "number" ? value + 1 : 1;
  }
}

export const membershipAssignmentService = new MembershipAssignmentService();

import type { AccessDecision } from "../../models/membership/MembershipAccessModels";
import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";

export class AccessAuditService {
  async recordDecision(decision: AccessDecision, context: { memberId?: string; sessionId?: string } = {}) {
    if (!decision.auditRequired && decision.allowed && decision.action === "view") return;
    await jsonDatabase.update((data) => {
      data.memberAccessHistory.unshift({
        accessHistoryId: `access-${Date.now()}-${createOpaqueToken(6)}`,
        memberId: context.memberId,
        resourceType: decision.resourceType,
        resourceId: decision.resourceId,
        action: decision.action,
        decision: decision.decision,
        reasonCode: decision.reasonCode,
        policyVersion: decision.matchedPolicyId,
        occurredAt: new Date().toISOString(),
        sessionReferenceHash: context.sessionId ? hashSecret(context.sessionId) : undefined,
        metadataSafe: decision.metadataSafe,
        schemaVersion: 1,
      });
      data.memberAccessHistory = data.memberAccessHistory.slice(0, 5000);
    });
  }

  recordGrantChange(action: string, memberId: string, summary: string, actorId?: string) {
    return mediaAuditPersistenceService.record(action, summary, { actorId, entityType: "member_account", entityId: memberId });
  }

  getHealth() {
    return { status: "ok", checkedAt: new Date().toISOString() };
  }
}

export const accessAuditService = new AccessAuditService();

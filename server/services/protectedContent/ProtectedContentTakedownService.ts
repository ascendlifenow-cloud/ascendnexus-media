import { createOpaqueToken } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";

export class ProtectedContentTakedownService {
  async disableResource(resourceType: string, resourceId: string, reason: string, actor?: string) {
    const now = new Date().toISOString();
    const takedown = {
      takedownId: `takedown-${Date.now()}-${createOpaqueToken(6)}`,
      resourceType,
      resourceId,
      reason,
      status: "active" as const,
      createdBy: actor,
      createdAt: now,
      metadataSafe: {},
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      data.protectedContentTakedowns.push(takedown);
      for (const resource of data.protectedMediaResources) {
        if ((resource.contentType === resourceType && resource.contentId === resourceId) || (resourceType === "media" && resource.mediaAssetId === resourceId) || resourceType === "global") resource.status = "blocked";
      }
      for (const authorization of data.protectedMediaAuthorizations) {
        if (((authorization.resourceType === resourceType && authorization.resourceId === resourceId) || (resourceType === "media" && (authorization.mediaAssetId ?? authorization.mediaId) === resourceId) || resourceType === "global") && authorization.status === "active") {
          authorization.status = "revoked";
          authorization.revokedAt = now;
          authorization.revokeReason = reason;
        }
      }
      for (const session of data.protectedPlaybackSessions) {
        if (data.protectedMediaAuthorizations.some((authorization) => authorization.authorizationId === session.authorizationId && ((authorization.resourceType === resourceType && authorization.resourceId === resourceId) || (resourceType === "media" && (authorization.mediaAssetId ?? authorization.mediaId) === resourceId) || resourceType === "global"))) {
          session.status = "revoked";
          session.endedAt = now;
        }
      }
    });
    return takedown;
  }

  async restoreResource(resourceType: string, resourceId: string, actor?: string) {
    const now = new Date().toISOString();
    await jsonDatabase.update((data) => {
      for (const takedown of data.protectedContentTakedowns) {
        if (takedown.resourceType === resourceType && takedown.resourceId === resourceId && takedown.status === "active") {
          takedown.status = "restored";
          takedown.restoredBy = actor;
          takedown.restoredAt = now;
        }
      }
      for (const resource of data.protectedMediaResources) {
        const selected = (resource.contentType === resourceType && resource.contentId === resourceId) || (resourceType === "media" && resource.mediaAssetId === resourceId) || resourceType === "global";
        const stillBlocked = data.protectedContentTakedowns.some((item) => item.status === "active" && ((item.resourceType === resource.contentType && item.resourceId === resource.contentId) || (item.resourceType === "media" && item.resourceId === resource.mediaAssetId) || item.resourceType === "global"));
        if (selected && !stillBlocked && resource.status === "blocked") resource.status = "ready";
      }
    });
    return { restored: true, resourceType, resourceId, restoredAt: now };
  }
}

export const protectedContentTakedownService = new ProtectedContentTakedownService();

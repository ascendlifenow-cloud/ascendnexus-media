import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";

export class ProtectedPlaybackSessionService {
  async create(input: { memberId: string; sessionId: string; mediaAssetId: string; contentId: string; authorizationId: string; clientCategory?: string }) {
    const now = new Date();
    const record = {
      playbackSessionId: `playback-${Date.now()}-${createOpaqueToken(6)}`,
      memberId: input.memberId,
      sessionIdHash: hashSecret(input.sessionId),
      mediaAssetId: input.mediaAssetId,
      contentId: input.contentId,
      authorizationId: input.authorizationId,
      status: "authorized" as const,
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      clientCategory: input.clientCategory,
      metadataSafe: {},
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      data.protectedPlaybackSessions.push(record);
    });
    return record;
  }

  async get(playbackSessionId: string, memberId: string) {
    const record = (await jsonDatabase.read()).protectedPlaybackSessions.find((item) => item.playbackSessionId === playbackSessionId && item.memberId === memberId);
    if (!record) throw new Error("PROTECTED_STREAM_SESSION_INVALID");
    return record;
  }

  async update(playbackSessionId: string, memberId: string, status: "starting" | "playing" | "paused" | "completed" | "failed") {
    let updated;
    await jsonDatabase.update((data) => {
      const record = data.protectedPlaybackSessions.find((item) => item.playbackSessionId === playbackSessionId && item.memberId === memberId);
      if (!record) return;
      record.status = status;
      record.lastHeartbeatAt = new Date().toISOString();
      if (status === "completed" || status === "failed") record.endedAt = record.lastHeartbeatAt;
      updated = record;
    });
    if (!updated) throw new Error("PROTECTED_STREAM_SESSION_INVALID");
    return updated;
  }

  async revokeForMember(memberId: string, reason: string) {
    await jsonDatabase.update((data) => {
      for (const session of data.protectedPlaybackSessions) {
        if (session.memberId === memberId && ["authorized", "starting", "playing", "paused"].includes(session.status)) {
          session.status = "revoked";
          session.endedAt = new Date().toISOString();
          session.metadataSafe = { ...(session.metadataSafe ?? {}), revokeReason: reason };
        }
      }
      for (const authorization of data.protectedMediaAuthorizations) {
        if (authorization.memberId === memberId && authorization.status === "active") {
          authorization.status = "revoked";
          authorization.revokedAt = new Date().toISOString();
          authorization.revokeReason = reason;
        }
      }
    });
  }
}

export const protectedPlaybackSessionService = new ProtectedPlaybackSessionService();

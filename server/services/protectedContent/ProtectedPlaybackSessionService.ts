import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { evaluateSongAction } from "../access/SongUsageService";
import { AuthApiError } from "../../utils/auth/authErrorUtils";

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
      const authorization = data.protectedMediaAuthorizations.find((item) => item.authorizationId === input.authorizationId && item.memberId === input.memberId && item.sessionIdHash === record.sessionIdHash && item.mediaAssetId === input.mediaAssetId && item.resourceId === input.contentId && item.action === "stream" && item.status === "active" && Date.parse(item.expiresAt) > Date.now());
      const decision = authorization && evaluateSongAction(data, input.memberId, input.contentId, "stream", authorization.authorizationId);
      if (!authorization || !decision?.allowed || authorization.authorizationVersion !== decision.authorizationVersion) throw new AuthApiError("PROTECTED_STREAM_SESSION_INVALID", "Playback authorization is unavailable.", 403);
      if (data.protectedPlaybackSessions.some((item) => item.authorizationId === input.authorizationId && item.memberId === input.memberId)) throw new AuthApiError("PROTECTED_STREAM_SESSION_EXISTS", "A playback session already exists for this authorization.", 409);
      record.expiresAt = authorization.expiresAt;
      data.protectedPlaybackSessions.push(record);
    });
    const { sessionIdHash: _sessionIdHash, ...safe } = record;
    return { ...safe, status: Date.parse(record.expiresAt) <= Date.now() && ["authorized", "starting", "playing", "paused"].includes(record.status) ? "expired" : record.status };
  }

  async get(playbackSessionId: string, memberId: string, sessionId?: string) {
    const record = (await jsonDatabase.read()).protectedPlaybackSessions.find((item) => item.playbackSessionId === playbackSessionId && item.memberId === memberId);
    if (!record || (sessionId && record.sessionIdHash !== hashSecret(sessionId))) throw new AuthApiError("PROTECTED_STREAM_SESSION_INVALID", "Playback session is unavailable.", 404);
    const { sessionIdHash: _sessionIdHash, ...safe } = record;
    return { ...safe, status: Date.parse(record.expiresAt) <= Date.now() && ["authorized", "starting", "playing", "paused"].includes(record.status) ? "expired" : record.status };
  }

  async update(playbackSessionId: string, memberId: string, status: "starting" | "playing" | "paused" | "completed" | "failed", sessionId?: string) {
    if (!["starting", "playing", "paused", "completed", "failed"].includes(status)) throw new AuthApiError("PROTECTED_STREAM_STATE_INVALID", "Playback state is invalid.", 400);
    let updated;
    await jsonDatabase.update((data) => {
      const record = data.protectedPlaybackSessions.find((item) => item.playbackSessionId === playbackSessionId && item.memberId === memberId);
      if (!record || (sessionId && record.sessionIdHash !== hashSecret(sessionId))) return;
      const authorization = data.protectedMediaAuthorizations.find((item) => item.authorizationId === record.authorizationId && item.memberId === memberId && item.status === "active" && Date.parse(item.expiresAt) > Date.now());
      if (["completed", "failed", "revoked", "expired"].includes(record.status) || Date.parse(record.expiresAt) <= Date.now() || !authorization || !evaluateSongAction(data, memberId, record.contentId, "stream", record.authorizationId).allowed) throw new AuthApiError("PROTECTED_STREAM_SESSION_INVALID", "Playback authorization is unavailable.", 403);
      record.status = status;
      record.lastHeartbeatAt = new Date().toISOString();
      if (status === "completed" || status === "failed") record.endedAt = record.lastHeartbeatAt;
      record.metadataSafe = { ...record.metadataSafe, clientReported: true };
      const { sessionIdHash: _sessionIdHash, ...safe } = record;
      updated = safe;
    });
    if (!updated) throw new AuthApiError("PROTECTED_STREAM_SESSION_INVALID", "Playback session is unavailable.", 404);
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

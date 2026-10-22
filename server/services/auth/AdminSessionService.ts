import { getBackendConfig } from "../../config/backendConfig";
import type { AdminSession, AdminSessionResponse } from "../../models/auth/AdminSessionModel";
import type { AdminUser } from "../../models/auth/AdminUserModel";
import { createOpaqueToken, getDeviceLabel, hashRequestIp, hashSecret, hashUserAgent } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import type { IncomingMessage } from "node:http";

const hours = (value: number) => value * 60 * 60 * 1000;

export class AdminSessionService {
  async createSession(user: AdminUser, request: IncomingMessage) {
    const now = new Date();
    const token = createOpaqueToken();
    const session: AdminSession = {
      sessionId: `session-${Date.now()}-${createOpaqueToken(6)}`,
      userId: user.userId,
      tokenHash: hashSecret(token),
      status: "active",
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + hours(8)).toISOString(),
      absoluteExpiresAt: new Date(now.getTime() + hours(24)).toISOString(),
      ipHash: hashRequestIp(request),
      userAgentHash: hashUserAgent(request),
      deviceLabel: getDeviceLabel(request),
    };
    await jsonDatabase.insertCollectionRecord("adminSessions", session);
    return { token, session };
  }

  async getSessionByToken(token: string): Promise<AdminSession | null> {
    const tokenHash = hashSecret(token);
    return jsonDatabase.findCollectionRecord("adminSessions", { tokenHash });
  }

  async touchSession(sessionId: string) {
    const now = new Date().toISOString();
    await jsonDatabase.patchCollectionRecord("adminSessions", { sessionId }, { lastSeenAt: now });
  }

  isSessionUsable(session: AdminSession): boolean {
    const now = Date.now();
    if (session.status !== "active") return false;
    if (Date.parse(session.expiresAt) <= now) return false;
    if (session.absoluteExpiresAt && Date.parse(session.absoluteExpiresAt) <= now) return false;
    return true;
  }

  async revokeSession(sessionId: string, revokedBy?: string, reason = "revoked") {
    await jsonDatabase.patchCollectionRecord("adminSessions", { sessionId, status: "active" }, {
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokedBy,
      revocationReason: reason,
    });
  }

  async revokeUserSessions(userId: string, revokedBy?: string, reason = "user_sessions_revoked", exceptSessionId?: string) {
    const sessions = await jsonDatabase.listCollection("adminSessions");
    await Promise.all(sessions
      .filter((session) => session.userId === userId && session.sessionId !== exceptSessionId && session.status === "active")
      .map((session) => this.revokeSession(session.sessionId, revokedBy, reason)));
  }

  async listUserSessions(userId: string, currentSessionId?: string): Promise<AdminSessionResponse[]> {
    const sessions = await jsonDatabase.listCollection("adminSessions");
    return sessions
      .filter((session) => session.userId === userId && session.status === "active")
      .map((session) => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        deviceLabel: session.deviceLabel,
        current: session.sessionId === currentSessionId,
      }));
  }

  getCookieExpiration(session: AdminSession): string {
    return session.expiresAt;
  }

  getCookieName() {
    return getBackendConfig().auth.cookieName;
  }
}

export const adminSessionService = new AdminSessionService();

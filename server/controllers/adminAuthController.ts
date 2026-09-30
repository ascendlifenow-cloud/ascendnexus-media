import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { adminBootstrapService } from "../services/auth/AdminBootstrapService";
import { adminRoleService } from "../services/auth/AdminRoleService";
import { authenticationHealthService } from "../services/auth/AuthenticationHealthService";
import { authenticationService } from "../services/auth/AuthenticationService";
import { passwordResetService } from "../services/auth/PasswordResetService";
import { adminSessionService } from "../services/auth/AdminSessionService";
import { adminActivationService } from "../services/auth/AdminActivationService";
import { buildClearSessionCookie, buildSessionCookie, setCookie } from "../utils/auth/authCookieUtils";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";

export class AdminAuthController {
  async login(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { email?: string; password?: string; rememberMe?: boolean };
    const result = await authenticationService.login(request, body.email ?? "", body.password ?? "");
    setCookie(response, buildSessionCookie(result.sessionToken, result.sessionExpiresAt ?? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()));
    await mediaAuditPersistenceService.record("admin_login_success", `Admin login for ${result.user.email}`, {
      actorId: result.user.userId,
      entityType: "admin_user",
      entityId: result.user.userId,
    });
    sendJson(response, 200, { success: true, data: { authenticated: true, requiresMfa: false, user: result.user, roles: result.user.roles, permissions: result.permissions, sessionId: result.sessionId, sessionExpiresAt: result.sessionExpiresAt, redirectTo: "/admin/dashboard" } });
  }

  async session(request: IncomingMessage, response: ServerResponse) {
    const result = await authenticationService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { authenticated: true, user: result.user, roles: result.user.roles, permissions: result.permissions, sessionId: result.sessionId, sessionExpiresAt: result.sessionExpiresAt, mfaState: "not_configured", accountStatus: result.user.status } });
  }

  async logout(request: IncomingMessage, response: ServerResponse) {
    await authenticationService.logout(request);
    setCookie(response, buildClearSessionCookie());
    sendJson(response, 200, { success: true });
  }

  async logoutAll(request: IncomingMessage, response: ServerResponse) {
    const context = await authenticationService.authenticateRequest(request);
    await adminSessionService.revokeUserSessions(context.user.userId, context.user.userId, "logout_all", context.sessionId);
    sendJson(response, 200, { success: true });
  }

  async sessions(request: IncomingMessage, response: ServerResponse) {
    const context = await authenticationService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await adminSessionService.listUserSessions(context.user.userId, context.sessionId) });
  }

  async revokeSession(request: IncomingMessage, response: ServerResponse, sessionId: string) {
    const context = await authenticationService.authenticateRequest(request);
    await adminSessionService.revokeSession(sessionId, context.user.userId, "session_revoked");
    sendJson(response, 200, { success: true });
  }

  async changePassword(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { currentPassword?: string; newPassword?: string };
    const user = await authenticationService.changePassword(request, body.currentPassword ?? "", body.newPassword ?? "");
    setCookie(response, buildClearSessionCookie());
    sendJson(response, 200, { success: true, data: { user } });
  }

  async requestPasswordReset(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { email?: string };
    const result = await passwordResetService.requestReset(request, body.email ?? "");
    sendJson(response, 200, { success: true, data: result });
  }

  async completePasswordReset(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { token?: string; password?: string; newPassword?: string };
    await passwordResetService.completeReset(body.token ?? "", body.newPassword ?? body.password ?? "");
    sendJson(response, 200, { success: true });
  }

  async activate(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { setupToken?: string; newPassword?: string; displayName?: string };
    const user = await adminActivationService.activate(body.setupToken ?? "", body.newPassword ?? "", body.displayName);
    sendJson(response, 200, { success: true, data: { activated: true, user, redirectTo: "/admin/login" } });
  }

  async availability(_request: IncomingMessage, response: ServerResponse) {
    const health = await authenticationHealthService.getHealth();
    sendJson(response, 200, {
      success: true,
      data: {
        available: health.overallStatus !== "unavailable",
        temporarilyUnavailable: health.overallStatus === "unavailable",
        setupIncomplete: health.bootstrapRequired,
        mfaRequiredByPolicy: health.mfaReady === false,
        retryAfter: undefined,
      },
    });
  }

  async roles(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "roles.read");
    sendJson(response, 200, { success: true, data: await adminRoleService.listRoles() });
  }

  async permissions(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "roles.read");
    sendJson(response, 200, { success: true, data: adminRoleService.listPermissions() });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    if (!auth.permissions.includes("security.read") && !auth.permissions.includes("users.manage")) {
      mediaAuthorizationService.requirePermission(auth, "security.read");
    }
    sendJson(response, 200, { success: true, data: await authenticationHealthService.getHealth() });
  }

  async bootstrapStatus(_request: IncomingMessage, response: ServerResponse) {
    sendJson(response, 200, { success: true, data: await adminBootstrapService.getBootstrapState() });
  }

  async initialize(_request: IncomingMessage, response: ServerResponse) {
    sendJson(response, 200, { success: true, data: await adminBootstrapService.initializeRoles() });
  }
}

export const adminAuthController = new AdminAuthController();

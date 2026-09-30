import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";
import type { AdminUserResponse } from "../../models/auth/AdminUserModel";
import { sanitizeAdminUser } from "../../models/auth/AdminUserModel";
import { AuthApiError, genericInvalidCredentials } from "../../utils/auth/authErrorUtils";
import { getSessionCookie } from "../../utils/auth/authCookieUtils";
import { hashRequestIp } from "../../utils/auth/sessionSecurityUtils";
import { authorizationService } from "./AuthorizationService";
import { adminSessionService } from "./AdminSessionService";
import { adminUserService } from "./AdminUserService";
import { passwordService } from "./PasswordService";
import { loginProtectionService } from "./LoginProtectionService";

export interface AuthenticatedAdminContext {
  user: AdminUserResponse;
  permissions: string[];
  sessionId?: string;
  sessionExpiresAt?: string;
}

export interface LoginResult extends AuthenticatedAdminContext {
  sessionToken: string;
}

export class AuthenticationService {
  async login(request: IncomingMessage, email: string, password: string): Promise<LoginResult> {
    loginProtectionService.assertAllowed(request, email);
    const user = await adminUserService.getUserByEmail(email);
    if (!user) {
      passwordService.verifyPassword(password, "$scrypt$16384$8$1$invalid$invalid");
      loginProtectionService.recordFailure(request, email);
      throw genericInvalidCredentials();
    }
    if (user.status === "pending" || user.status === "pending_activation") throw genericInvalidCredentials();
    if (user.status === "disabled" || user.status === "deleted" || user.status === "archived") throw new AuthApiError("AUTH_ACCOUNT_DISABLED", "Admin account is not active.");
    if (user.status === "locked" && (!user.lockedUntil || Date.parse(user.lockedUntil) > Date.now())) throw new AuthApiError("AUTH_ACCOUNT_LOCKED", "Admin account is temporarily locked.");
    if (!passwordService.verifyPassword(password, user.passwordHash)) {
      await adminUserService.recordFailedLogin(user.userId);
      loginProtectionService.recordFailure(request, email);
      throw genericInvalidCredentials();
    }
    const preSessionPermissions = authorizationService.getEffectivePermissions(user);
    if (!preSessionPermissions.includes("admin.access")) {
      loginProtectionService.recordFailure(request, email);
      throw genericInvalidCredentials();
    }
    const { token, session } = await adminSessionService.createSession(user, request);
    await adminUserService.recordSuccessfulLogin(user.userId, hashRequestIp(request));
    loginProtectionService.clear(request, email);
    const fresh = await adminUserService.requireUser(user.userId);
    const permissions = authorizationService.getEffectivePermissions(fresh);
    if (!permissions.includes("admin.access")) throw new AuthApiError("AUTH_PERMISSION_DENIED", "Administrative access is required.");
    return {
      sessionToken: token,
      user: sanitizeAdminUser(fresh, permissions),
      permissions,
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt,
    };
  }

  async authenticateRequest(request: IncomingMessage): Promise<AuthenticatedAdminContext> {
    const token = getSessionCookie(request);
    if (!token) throw new AuthApiError("AUTH_REQUIRED", "Admin authentication is required.");
    const session = await adminSessionService.getSessionByToken(token);
    if (!session) throw new AuthApiError("AUTH_SESSION_INVALID", "Admin session is invalid.");
    if (!adminSessionService.isSessionUsable(session)) throw new AuthApiError("AUTH_SESSION_EXPIRED", "Admin session has expired.");
    const user = await adminUserService.requireUser(session.userId);
    if (user.status === "pending" || user.status === "pending_activation") throw new AuthApiError("AUTH_REQUIRED", "Admin account is not active.");
    if (user.status === "disabled" || user.status === "deleted" || user.status === "archived") throw new AuthApiError("AUTH_ACCOUNT_DISABLED", "Admin account is not active.");
    if (user.status === "locked" && (!user.lockedUntil || Date.parse(user.lockedUntil) > Date.now())) throw new AuthApiError("AUTH_ACCOUNT_LOCKED", "Admin account is temporarily locked.");
    await adminSessionService.touchSession(session.sessionId);
    const permissions = authorizationService.getEffectivePermissions(user);
    if (!permissions.includes("admin.access")) throw new AuthApiError("AUTH_PERMISSION_DENIED", "Administrative access is required.");
    return {
      user: sanitizeAdminUser(user, permissions),
      permissions,
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt,
    };
  }

  async logout(request: IncomingMessage): Promise<void> {
    const token = getSessionCookie(request);
    if (!token) return;
    const session = await adminSessionService.getSessionByToken(token);
    if (session) await adminSessionService.revokeSession(session.sessionId, session.userId, "logout");
  }

  async changePassword(request: IncomingMessage, currentPassword: string, newPassword: string): Promise<AdminUserResponse> {
    const context = await this.authenticateRequest(request);
    const user = await adminUserService.requireUser(context.user.userId);
    if (!passwordService.verifyPassword(currentPassword, user.passwordHash)) throw new AuthApiError("AUTH_PASSWORD_INCORRECT", "Current password is incorrect.");
    return adminUserService.setPassword(user.userId, newPassword, user.userId);
  }

  isLegacyDevAuthAllowed(): boolean {
    const config = getBackendConfig();
    return !config.app.isProduction && !config.app.isStaging && (!config.auth.enabled || config.auth.authDisabled);
  }
}

export const authenticationService = new AuthenticationService();

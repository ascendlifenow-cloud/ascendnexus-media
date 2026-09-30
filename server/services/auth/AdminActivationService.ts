import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { jsonDatabase } from "../media/JsonDatabase";
import { adminSessionService } from "./AdminSessionService";
import { adminUserService } from "./AdminUserService";
import { passwordService } from "./PasswordService";

const activationHours = 24;

export class AdminActivationService {
  async createActivationToken(userId: string, createdBy = "bootstrap"): Promise<{ activationTokenId: string; setupToken: string; expiresAt: string }> {
    const setupToken = createOpaqueToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + activationHours * 60 * 60 * 1000).toISOString();
    const activationTokenId = `activation-${Date.now()}-${createOpaqueToken(6)}`;
    await jsonDatabase.update((data) => {
      for (const token of data.adminActivationTokens) {
        if (token.userId === userId && token.status === "active") {
          token.status = "revoked";
          token.revokedAt = now;
        }
      }
      data.adminActivationTokens.push({
        activationTokenId,
        userId,
        tokenHash: hashSecret(setupToken),
        status: "active",
        expiresAt,
        createdAt: now,
        createdBy,
      });
    });
    return { activationTokenId, setupToken, expiresAt };
  }

  async activate(setupToken: string, newPassword: string, displayName?: string) {
    const tokenHash = hashSecret(setupToken);
    let userId: string | undefined;
    await jsonDatabase.update((data) => {
      const record = data.adminActivationTokens.find((item) => item.tokenHash === tokenHash && item.status === "active");
      if (!record) throw new AuthApiError("AUTH_RESET_TOKEN_INVALID", "Activation token is invalid.");
      if (Date.parse(record.expiresAt) <= Date.now()) {
        record.status = "expired";
        throw new AuthApiError("AUTH_RESET_TOKEN_EXPIRED", "Activation token has expired.");
      }
      record.status = "used";
      record.usedAt = new Date().toISOString();
      userId = record.userId;
    });
    if (!userId) throw new AuthApiError("AUTH_RESET_TOKEN_INVALID", "Activation token is invalid.");
    const user = await adminUserService.requireUser(userId);
    if (user.status !== "pending_activation" && user.status !== "pending") throw new AuthApiError("AUTH_BOOTSTRAP_NOT_ALLOWED", "Admin activation is not available for this account.");
    const policy = passwordService.validatePasswordPolicy(newPassword, { email: user.email, displayName: displayName ?? user.displayName });
    if (!policy.valid) throw new AuthApiError("AUTH_PASSWORD_POLICY_FAILED", policy.errors.join(" "));
    await jsonDatabase.update((data) => {
      const target = data.adminUsers.find((item) => item.userId === userId);
      if (!target) return;
      target.passwordHash = passwordService.hashPassword(newPassword);
      target.displayName = displayName?.trim() || target.displayName;
      target.status = "active";
      target.emailVerified = true;
      target.emailVerifiedAt = new Date().toISOString();
      target.activatedAt = new Date().toISOString();
      target.passwordChangedAt = new Date().toISOString();
      target.failedLoginCount = 0;
      target.updatedAt = new Date().toISOString();
      for (const state of data.adminBootstrapStates) {
        if (state.initialAdministratorId === userId && !state.bootstrapCompleted) {
          state.bootstrapRequired = false;
          state.bootstrapCompleted = true;
          state.completedAt = new Date().toISOString();
          state.updatedAt = new Date().toISOString();
        }
      }
    });
    await adminSessionService.revokeUserSessions(userId, userId, "admin_activation_completed");
    const activated = await adminUserService.requireUser(userId);
    await mediaAuditPersistenceService.record("admin_activation_completed", "Admin activation completed.", {
      actorId: activated.userId,
      entityType: "admin_user",
      entityId: activated.userId,
    });
    return adminUserService.toResponse(activated);
  }
}

export const adminActivationService = new AdminActivationService();

import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { createOpaqueToken, hashRequestIp, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { jsonDatabase } from "../media/JsonDatabase";
import { adminUserService } from "./AdminUserService";

export class PasswordResetService {
  async requestReset(request: IncomingMessage, email: string): Promise<{ accepted: true; resetToken?: string }> {
    const config = getBackendConfig();
    if (!config.auth.passwordResetEnabled && !config.app.isDevelopment && !config.app.isTest) return { accepted: true };
    const user = await adminUserService.getUserByEmail(email);
    if (!user || user.status !== "active") return { accepted: true };
    const resetToken = createOpaqueToken();
    await jsonDatabase.update((data) => {
      data.passwordResetTokens.push({
        resetTokenId: `reset-${Date.now()}-${createOpaqueToken(6)}`,
        userId: user.userId,
        tokenHash: hashSecret(resetToken),
        status: "active",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        requestedAt: new Date().toISOString(),
        requestIpHash: hashRequestIp(request),
      });
    });
    await mediaAuditPersistenceService.record("admin_password_reset_requested", `Password reset requested for ${user.email}`, {
      actorId: user.userId,
      entityType: "admin_user",
      entityId: user.userId,
    });
    return { accepted: true, resetToken: config.app.isDevelopment || config.app.isTest ? resetToken : undefined };
  }

  async completeReset(token: string, newPassword: string): Promise<{ success: true }> {
    const tokenHash = hashSecret(token);
    let userId: string | undefined;
    await jsonDatabase.update((data) => {
      const reset = data.passwordResetTokens.find((item) => item.tokenHash === tokenHash && item.status === "active");
      if (!reset) throw new AuthApiError("AUTH_RESET_TOKEN_INVALID", "Password reset token is invalid.");
      if (Date.parse(reset.expiresAt) <= Date.now()) {
        reset.status = "expired";
        throw new AuthApiError("AUTH_RESET_TOKEN_EXPIRED", "Password reset token has expired.");
      }
      reset.status = "used";
      reset.usedAt = new Date().toISOString();
      userId = reset.userId;
    });
    if (!userId) throw new AuthApiError("AUTH_RESET_TOKEN_INVALID", "Password reset token is invalid.");
    await adminUserService.setPassword(userId, newPassword, userId);
    return { success: true };
  }
}

export const passwordResetService = new PasswordResetService();

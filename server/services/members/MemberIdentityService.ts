import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";
import {
  defaultMemberPreferences,
  sanitizeMemberAccount,
  type MemberAccount,
  type MemberAccountResponse,
  type MemberPasswordResetToken,
  type MemberPreferences,
  type MemberSession,
  type MemberSessionResponse,
  type MemberVerificationToken,
} from "../../models/members/MemberModels";
import { AuthApiError, genericInvalidCredentials } from "../../utils/auth/authErrorUtils";
import { normalizeEmail } from "../../utils/auth/passwordPolicyUtils";
import { createOpaqueToken, getDeviceLabel, hashRequestIp, hashSecret, hashUserAgent } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { loginProtectionService } from "../auth/LoginProtectionService";
import { passwordService } from "../auth/PasswordService";
import { membershipAssignmentService } from "../membership/MembershipAssignmentService";
import { emailDeliveryService } from "../email/EmailDeliveryService";
import { memberVerificationEmailTemplates } from "../email/templates/memberVerificationEmailTemplates";

const hours = (value: number) => value * 60 * 60 * 1000;
const memberCookieName = () => process.env.MEMBER_AUTH_COOKIE_NAME || "anm_member_session";
const verificationResendAttempts = new Map<string, number[]>();
const passwordResetAttempts = new Map<string, number[]>();
const pruneAttempts = (attempts: number[], windowMs: number) => {
  const cutoff = Date.now() - windowMs;
  return attempts.filter((timestamp) => timestamp > cutoff);
};

export interface MemberAuthSession {
  authenticated: true;
  member: MemberAccountResponse;
  sessionId: string;
  sessionExpiresAt: string;
}

export class MemberIdentityService {
  async register(request: IncomingMessage, input: { email?: string; password?: string; displayName?: string; acceptTerms?: boolean; acceptPrivacy?: boolean; newsletterOptIn?: boolean }) {
    const email = (input.email ?? "").trim();
    const normalizedEmail = normalizeEmail(email);
    const displayName = (input.displayName ?? "").trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) throw new AuthApiError("MEMBER_EMAIL_INVALID", "A valid email address is required.", 400);
    if (!displayName || displayName.length > 80) throw new AuthApiError("MEMBER_DISPLAY_NAME_INVALID", "A display name is required.", 400);
    if (!input.acceptTerms || !input.acceptPrivacy) throw new AuthApiError("MEMBER_TERMS_REQUIRED", "Terms and privacy acceptance are required.", 400);
    const passwordPolicy = passwordService.validatePasswordPolicy(input.password ?? "", { email, displayName });
    if (!passwordPolicy.valid) throw new AuthApiError("MEMBER_PASSWORD_INVALID", passwordPolicy.errors[0] ?? "Password does not meet policy.", 400);
    const existing = await this.getByEmail(normalizedEmail);
    if (existing && existing.status !== "Deleted") throw new AuthApiError("MEMBER_EMAIL_EXISTS", "A member account already exists for this email.", 409);

    const now = new Date().toISOString();
    const member: MemberAccount = {
      memberId: `member-${Date.now()}-${createOpaqueToken(6)}`,
      email,
      normalizedEmail,
      displayName,
      membershipTier: "Free Member",
      status: "PendingVerification",
      emailVerified: false,
      passwordHash: passwordService.hashPassword(input.password ?? ""),
      createdAt: now,
      updatedAt: now,
      failedLoginCount: 0,
      preferences: {
        ...defaultMemberPreferences(),
        notifications: {
          ...defaultMemberPreferences().notifications,
          newsletter: Boolean(input.newsletterOptIn),
          marketing: Boolean(input.newsletterOptIn),
        },
      },
      schemaVersion: 1,
    };
    let verificationToken = "";
    await jsonDatabase.update((data) => {
      data.memberAccounts.push(member);
      verificationToken = this.createVerificationTokenRecord(data.memberVerificationTokens, member.memberId, request);
    });
    await this.audit("member_registered", member.memberId, "Member registered.");
    await membershipAssignmentService.assignDefaultFreeTier(member.memberId);
    await this.queueVerificationEmail(member, verificationToken, request, "member_registration_verification");
    await this.audit("member_verification_sent", member.memberId, "Member verification token generated.");
    await this.security("member_registered", "info", member.memberId, request, "Member registration accepted.");
    return { member: sanitizeMemberAccount(member), verificationRequired: true, verificationToken: this.shouldRevealDevTokens() ? verificationToken : undefined };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashSecret(token);
    let member: MemberAccount | undefined;
    await jsonDatabase.update((data) => {
      const record = data.memberVerificationTokens.find((item) => item.tokenHash === tokenHash && item.status === "active");
      if (!record) throw new AuthApiError("MEMBER_VERIFICATION_INVALID", "Verification token is invalid.", 400);
      if (Date.parse(record.expiresAt) <= Date.now()) {
        record.status = "expired";
        throw new AuthApiError("MEMBER_VERIFICATION_EXPIRED", "Verification token has expired.", 400);
      }
      member = data.memberAccounts.find((item) => item.memberId === record.memberId);
      if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      record.status = "used";
      record.usedAt = new Date().toISOString();
      member.status = "Active";
      member.emailVerified = true;
      member.emailVerifiedAt = record.usedAt;
      member.updatedAt = record.usedAt;
    });
    if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
    await this.audit("member_verification_completed", member.memberId, "Member email verification completed.");
    await emailDeliveryService.queueDelivery({
      deliveryType: "member_notification",
      recipientCategory: "member",
      recipient: member.email,
      relatedEntityType: "member_account",
      relatedEntityId: member.memberId,
      templateKey: "member_verification_successful",
      metadata: memberVerificationEmailTemplates.verificationSuccessful({ displayName: member.displayName }),
    });
    return { verified: true, member: sanitizeMemberAccount(member) };
  }

  async resendVerification(request: IncomingMessage, email: string) {
    this.assertSensitiveActionAllowed(verificationResendAttempts, request, email, 5, 15 * 60 * 1000, "MEMBER_VERIFICATION_RATE_LIMITED", "Please wait before requesting another verification email.");
    const member = await this.getByEmail(email);
    if (!member || member.status === "Deleted" || member.emailVerified) return { accepted: true };
    let token = "";
    await jsonDatabase.update((data) => {
      for (const record of data.memberVerificationTokens) if (record.memberId === member.memberId && record.status === "active") record.status = "revoked";
      token = this.createVerificationTokenRecord(data.memberVerificationTokens, member.memberId, request);
    });
    await this.audit("member_verification_sent", member.memberId, "Member verification token resent.");
    await this.queueVerificationEmail(member, token, request, "member_resend_verification");
    return { accepted: true, verificationToken: this.shouldRevealDevTokens() ? token : undefined };
  }

  async login(request: IncomingMessage, input: { email?: string; password?: string; rememberMe?: boolean }): Promise<MemberAuthSession & { sessionToken: string }> {
    loginProtectionService.assertAllowed(request, input.email ?? "");
    const member = await this.getByEmail(input.email ?? "");
    if (!member) {
      passwordService.verifyPassword(input.password ?? "", "$scrypt$16384$8$1$invalid$invalid");
      loginProtectionService.recordFailure(request, input.email ?? "");
      await this.security("member_login_failure", "notice", undefined, request, "Member login failed.");
      throw genericInvalidCredentials();
    }
    this.assertLoginAllowed(member);
    if (!passwordService.verifyPassword(input.password ?? "", member.passwordHash)) {
      await this.recordFailedLogin(member.memberId, request);
      loginProtectionService.recordFailure(request, input.email ?? "");
      throw genericInvalidCredentials();
    }
    const { token, session } = await this.createSession(member, request, Boolean(input.rememberMe));
    await jsonDatabase.update((data) => {
      const target = data.memberAccounts.find((item) => item.memberId === member.memberId);
      if (target) {
        target.failedLoginCount = 0;
        target.lockedUntil = undefined;
        target.lastLogin = new Date().toISOString();
        target.updatedAt = target.lastLogin;
      }
    });
    loginProtectionService.clear(request, input.email ?? "");
    await this.audit("member_login_success", member.memberId, "Member login succeeded.");
    await this.security("member_login_success", "info", member.memberId, request, "Member login succeeded.");
    const fresh = await this.requireMember(member.memberId);
    return { authenticated: true, member: sanitizeMemberAccount(fresh), sessionId: session.sessionId, sessionExpiresAt: session.expiresAt, sessionToken: token };
  }

  async authenticateRequest(request: IncomingMessage): Promise<MemberAuthSession> {
    const token = this.getMemberSessionCookie(request);
    if (!token) throw new AuthApiError("MEMBER_AUTH_REQUIRED", "Member authentication is required.", 401);
    const session = await this.getSessionByToken(token);
    if (!session || !this.isSessionUsable(session)) throw new AuthApiError("MEMBER_SESSION_INVALID", "Member session is invalid or expired.", 401);
    const member = await this.requireMember(session.memberId);
    this.assertAccountUsable(member);
    await this.touchSession(session.sessionId);
    return { authenticated: true, member: sanitizeMemberAccount(member), sessionId: session.sessionId, sessionExpiresAt: session.expiresAt };
  }

  async logout(request: IncomingMessage) {
    const token = this.getMemberSessionCookie(request);
    if (!token) return;
    const session = await this.getSessionByToken(token);
    if (session) {
      await this.revokeSession(session.sessionId, session.memberId, "logout");
      await this.audit("member_logout", session.memberId, "Member logout.");
    }
  }

  async requestPasswordReset(request: IncomingMessage, email: string) {
    this.assertSensitiveActionAllowed(passwordResetAttempts, request, email, 5, 15 * 60 * 1000, "MEMBER_PASSWORD_RESET_RATE_LIMITED", "Please wait before requesting another password reset.");
    const member = await this.getByEmail(email);
    if (!member || member.status === "Deleted" || member.status === "Disabled" || member.status === "Suspended") return { accepted: true };
    const token = createOpaqueToken();
    await jsonDatabase.update((data) => {
      data.memberPasswordResetTokens.push({
        resetTokenId: `member-reset-${Date.now()}-${createOpaqueToken(6)}`,
        memberId: member.memberId,
        tokenHash: hashSecret(token),
        status: "active",
        expiresAt: new Date(Date.now() + hours(1)).toISOString(),
        requestedAt: new Date().toISOString(),
        requestIpHash: hashRequestIp(request),
      });
    });
    await this.audit("member_password_reset_requested", member.memberId, "Member password reset requested.");
    return { accepted: true, resetToken: this.shouldRevealDevTokens() ? token : undefined };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashSecret(token);
    let memberId = "";
    await jsonDatabase.update((data) => {
      const record = data.memberPasswordResetTokens.find((item) => item.tokenHash === tokenHash && item.status === "active");
      if (!record) throw new AuthApiError("MEMBER_RESET_TOKEN_INVALID", "Password reset token is invalid.", 400);
      if (Date.parse(record.expiresAt) <= Date.now()) {
        record.status = "expired";
        throw new AuthApiError("MEMBER_RESET_TOKEN_EXPIRED", "Password reset token has expired.", 400);
      }
      record.status = "used";
      record.usedAt = new Date().toISOString();
      memberId = record.memberId;
    });
    await this.setPassword(memberId, newPassword, "password_reset_completed");
    return { success: true };
  }

  async changePassword(request: IncomingMessage, currentPassword: string, newPassword: string) {
    const context = await this.authenticateRequest(request);
    const member = await this.requireMember(context.member.memberId);
    if (!passwordService.verifyPassword(currentPassword, member.passwordHash)) throw new AuthApiError("MEMBER_PASSWORD_INCORRECT", "Current password is incorrect.", 400);
    await this.setPassword(member.memberId, newPassword, "password_changed");
    return sanitizeMemberAccount(await this.requireMember(member.memberId));
  }

  async updateProfile(request: IncomingMessage, input: { displayName?: string; avatar?: string; bio?: string }) {
    const context = await this.authenticateRequest(request);
    const now = new Date().toISOString();
    await jsonDatabase.update((data) => {
      const member = data.memberAccounts.find((item) => item.memberId === context.member.memberId);
      if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      if (input.displayName !== undefined) member.displayName = input.displayName.trim().slice(0, 80);
      if (input.avatar !== undefined) member.avatar = input.avatar.trim().slice(0, 500) || undefined;
      if (input.bio !== undefined) member.bio = input.bio.trim().slice(0, 500) || undefined;
      member.updatedAt = now;
    });
    await this.audit("member_profile_updated", context.member.memberId, "Member profile updated.");
    return sanitizeMemberAccount(await this.requireMember(context.member.memberId));
  }

  async updatePreferences(request: IncomingMessage, preferences: Partial<MemberPreferences>) {
    const context = await this.authenticateRequest(request);
    await jsonDatabase.update((data) => {
      const member = data.memberAccounts.find((item) => item.memberId === context.member.memberId);
      if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      member.preferences = {
        ...member.preferences,
        ...preferences,
        notifications: { ...member.preferences.notifications, ...(preferences.notifications ?? {}) },
        privacy: { ...member.preferences.privacy, ...(preferences.privacy ?? {}) },
      };
      member.updatedAt = new Date().toISOString();
    });
    await this.audit("member_preferences_updated", context.member.memberId, "Member preferences updated.");
    return sanitizeMemberAccount(await this.requireMember(context.member.memberId));
  }

  async listSessions(request: IncomingMessage): Promise<MemberSessionResponse[]> {
    const context = await this.authenticateRequest(request);
    const data = await jsonDatabase.read();
    return data.memberSessions.filter((session) => session.memberId === context.member.memberId && session.status === "active").map((session) => this.sanitizeSession(session, context.sessionId));
  }

  async revokeSession(sessionId: string, revokedBy?: string, reason = "revoked") {
    await jsonDatabase.update((data) => {
      const session = data.memberSessions.find((item) => item.sessionId === sessionId);
      if (session && session.status === "active") {
        session.status = "revoked";
        session.revokedAt = new Date().toISOString();
        session.revokedBy = revokedBy;
        session.revocationReason = reason;
      }
    });
  }

  async revokeOwnSession(request: IncomingMessage, sessionId: string) {
    const context = await this.authenticateRequest(request);
    let revoked = false;
    await jsonDatabase.update((data) => {
      const session = data.memberSessions.find((item) => item.sessionId === sessionId && item.memberId === context.member.memberId);
      if (!session) throw new AuthApiError("MEMBER_SESSION_NOT_FOUND", "Member session was not found.", 404);
      if (session.status === "active") {
        session.status = "revoked";
        session.revokedAt = new Date().toISOString();
        session.revokedBy = context.member.memberId;
        session.revocationReason = "member_session_revoked";
        revoked = true;
      }
    });
    if (revoked) await this.audit("member_session_revoked", context.member.memberId, "Member session revoked.");
    return { revoked: true };
  }

  async deleteAccount(request: IncomingMessage) {
    const context = await this.authenticateRequest(request);
    const now = new Date().toISOString();
    await jsonDatabase.update((data) => {
      const member = data.memberAccounts.find((item) => item.memberId === context.member.memberId);
      if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      member.status = "Deleted";
      member.deletedAt = now;
      member.updatedAt = now;
      for (const session of data.memberSessions) if (session.memberId === member.memberId && session.status === "active") session.status = "revoked";
    });
    await this.audit("member_account_deleted", context.member.memberId, "Member account deleted.");
    return { deleted: true };
  }

  async adminListMembers() {
    const data = await jsonDatabase.read();
    return data.memberAccounts.map(sanitizeMemberAccount).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async adminGetMember(memberId: string) {
    const member = await this.requireMember(memberId);
    const sessions = (await jsonDatabase.read()).memberSessions.filter((session) => session.memberId === memberId).map((session) => this.sanitizeSession(session));
    return { member: sanitizeMemberAccount(member), sessions };
  }

  async adminSetStatus(memberId: string, status: MemberAccount["status"], actorId?: string) {
    await jsonDatabase.update((data) => {
      const member = data.memberAccounts.find((item) => item.memberId === memberId);
      if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      member.status = status;
      member.updatedAt = new Date().toISOString();
      if (["Disabled", "Deleted", "Suspended"].includes(status)) {
        for (const session of data.memberSessions) if (session.memberId === memberId && session.status === "active") session.status = "revoked";
      }
    });
    await this.audit(`member_account_${status.toLowerCase()}`, memberId, `Member account status set to ${status}.`, actorId);
    return sanitizeMemberAccount(await this.requireMember(memberId));
  }

  async getHealth() {
    const data = await jsonDatabase.read();
    const activeMembers = data.memberAccounts.filter((member) => member.status === "Active").length;
    const pendingMembers = data.memberAccounts.filter((member) => member.status === "PendingVerification").length;
    const activeSessions = data.memberSessions.filter((session) => this.isSessionUsable(session)).length;
    return {
      overallStatus: "available",
      registrationReady: true,
      verificationReady: true,
      loginReady: true,
      sessionStoreReady: true,
      passwordResetReady: true,
      auditEventsReady: true,
      securityEventsReady: true,
      memberCount: data.memberAccounts.length,
      activeMembers,
      pendingMembers,
      activeSessions,
      checkedAt: new Date().toISOString(),
    };
  }

  getMemberCookieName() {
    return memberCookieName();
  }

  buildSessionCookie(token: string, expiresAt: string) {
    const config = getBackendConfig();
    const parts = [
      `${encodeURIComponent(memberCookieName())}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      `SameSite=${config.auth.cookieSameSite}`,
      `Expires=${new Date(expiresAt).toUTCString()}`,
    ];
    if (config.auth.cookieSecure) parts.push("Secure");
    if (config.auth.cookieDomain) parts.push(`Domain=${config.auth.cookieDomain}`);
    return parts.join("; ");
  }

  buildClearSessionCookie() {
    const config = getBackendConfig();
    const parts = [`${encodeURIComponent(memberCookieName())}=`, "Path=/", "HttpOnly", `SameSite=${config.auth.cookieSameSite}`, "Expires=Thu, 01 Jan 1970 00:00:00 GMT"];
    if (config.auth.cookieSecure) parts.push("Secure");
    if (config.auth.cookieDomain) parts.push(`Domain=${config.auth.cookieDomain}`);
    return parts.join("; ");
  }

  getMemberSessionCookie(request: IncomingMessage) {
    const raw = request.headers.cookie ?? "";
    const cookies = Object.fromEntries(raw.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [decodeURIComponent(key), decodeURIComponent(rest.join("="))];
    }).filter(([key]) => key));
    return cookies[memberCookieName()];
  }

  private async setPassword(memberId: string, password: string, auditAction: string) {
    const member = await this.requireMember(memberId);
    const policy = passwordService.validatePasswordPolicy(password, { email: member.email, displayName: member.displayName });
    if (!policy.valid) throw new AuthApiError("MEMBER_PASSWORD_INVALID", policy.errors[0] ?? "Password does not meet policy.", 400);
    await jsonDatabase.update((data) => {
      const target = data.memberAccounts.find((item) => item.memberId === memberId);
      if (!target) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
      target.passwordHash = passwordService.hashPassword(password);
      target.lastPasswordChange = new Date().toISOString();
      target.updatedAt = target.lastPasswordChange;
      for (const session of data.memberSessions) if (session.memberId === memberId && session.status === "active") session.status = "revoked";
    });
    await this.audit(auditAction, memberId, "Member password updated and sessions revoked.");
  }

  private async createSession(member: MemberAccount, request: IncomingMessage, rememberMe: boolean) {
    const now = new Date();
    const token = createOpaqueToken();
    const ttl = rememberMe ? hours(24 * 30) : hours(8);
    const session: MemberSession = {
      sessionId: `member-session-${Date.now()}-${createOpaqueToken(6)}`,
      memberId: member.memberId,
      tokenHash: hashSecret(token),
      status: "active",
      rememberMe,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttl).toISOString(),
      absoluteExpiresAt: new Date(now.getTime() + ttl).toISOString(),
      ipHash: hashRequestIp(request),
      userAgentHash: hashUserAgent(request),
      deviceLabel: getDeviceLabel(request),
    };
    await jsonDatabase.update((data) => {
      data.memberSessions.push(session);
    });
    return { token, session };
  }

  private async getSessionByToken(token: string) {
    const tokenHash = hashSecret(token);
    const data = await jsonDatabase.read();
    return data.memberSessions.find((session) => session.tokenHash === tokenHash) ?? null;
  }

  private isSessionUsable(session: MemberSession) {
    const now = Date.now();
    return session.status === "active" && Date.parse(session.expiresAt) > now && Date.parse(session.absoluteExpiresAt) > now;
  }

  private async touchSession(sessionId: string) {
    await jsonDatabase.update((data) => {
      const session = data.memberSessions.find((item) => item.sessionId === sessionId);
      if (session) session.lastActiveAt = new Date().toISOString();
    });
  }

  private sanitizeSession(session: MemberSession, currentSessionId?: string): MemberSessionResponse {
    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      deviceLabel: session.deviceLabel,
      current: session.sessionId === currentSessionId,
      rememberMe: session.rememberMe,
    };
  }

  private createVerificationTokenRecord(records: MemberVerificationToken[], memberId: string, request: IncomingMessage) {
    const token = createOpaqueToken();
    records.push({
      verificationTokenId: `member-verify-${Date.now()}-${createOpaqueToken(6)}`,
      memberId,
      tokenHash: hashSecret(token),
      status: "active",
      expiresAt: new Date(Date.now() + hours(24)).toISOString(),
      requestedAt: new Date().toISOString(),
      requestIpHash: hashRequestIp(request),
    });
    return token;
  }

  private async queueVerificationEmail(member: MemberAccount, token: string, request: IncomingMessage, templateKey: string) {
    const host = request.headers.host || "localhost";
    const protocol = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0] || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    const verificationUrl = `${protocol}://${host}/verify-email?token=${encodeURIComponent(token)}`;
    const template = memberVerificationEmailTemplates.registrationVerification({ displayName: member.displayName, verificationUrl, expiresInHours: 24 });
    await emailDeliveryService.queueDelivery({
      deliveryType: "member_verification",
      recipientCategory: "member",
      recipient: member.email,
      relatedEntityType: "member_account",
      relatedEntityId: member.memberId,
      templateKey,
      metadata: {
        subject: template.subject,
        text: template.text,
        html: template.html,
        verificationPath: "/verify-email",
        expiresInHours: 24,
      },
    });
  }

  private async recordFailedLogin(memberId: string, request: IncomingMessage) {
    await jsonDatabase.update((data) => {
      const member = data.memberAccounts.find((item) => item.memberId === memberId);
      if (!member) return;
      member.failedLoginCount += 1;
      if (member.failedLoginCount >= 5) {
        member.status = "Locked";
        member.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      member.updatedAt = new Date().toISOString();
    });
    await this.security("member_login_failure", "notice", memberId, request, "Member login failed.");
  }

  private assertLoginAllowed(member: MemberAccount) {
    this.assertAccountUsable(member);
    if (!member.emailVerified || member.status === "PendingVerification") throw new AuthApiError("MEMBER_EMAIL_UNVERIFIED", "Email verification is required before login.", 403);
  }

  private assertAccountUsable(member: MemberAccount) {
    if (member.status === "Deleted" || member.status === "Disabled" || member.status === "Suspended") throw new AuthApiError("MEMBER_ACCOUNT_DISABLED", "Member account is not active.", 403);
    if (member.status === "Locked" && (!member.lockedUntil || Date.parse(member.lockedUntil) > Date.now())) throw new AuthApiError("MEMBER_ACCOUNT_LOCKED", "Member account is temporarily locked.", 423);
  }

  private async getByEmail(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const data = await jsonDatabase.read();
    return data.memberAccounts.find((member) => member.normalizedEmail === normalizedEmail);
  }

  private async requireMember(memberId: string) {
    const data = await jsonDatabase.read();
    const member = data.memberAccounts.find((item) => item.memberId === memberId);
    if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member account was not found.", 404);
    return member;
  }

  private shouldRevealDevTokens() {
    const config = getBackendConfig();
    return config.app.isDevelopment || config.app.isTest;
  }

  private assertSensitiveActionAllowed(map: Map<string, number[]>, request: IncomingMessage, email: string, maxAttempts: number, windowMs: number, code: string, message: string) {
    const key = `${hashRequestIp(request)}:${normalizeEmail(email) || "unknown"}`;
    const attempts = pruneAttempts(map.get(key) ?? [], windowMs);
    if (attempts.length >= maxAttempts) throw new AuthApiError(code, message, 429);
    attempts.push(Date.now());
    map.set(key, attempts);
  }

  private async audit(action: string, memberId: string, summary: string, actorId?: string) {
    await mediaAuditPersistenceService.record(action, summary, { actorId, entityType: "member_account", entityId: memberId });
  }

  private async security(eventType: string, severity: "info" | "notice" | "warning" | "high" | "critical", memberId: string | undefined, request: IncomingMessage, summary: string) {
    await jsonDatabase.update((data) => {
      data.securityEvents.unshift({
        securityEventId: `security-${Date.now()}-${createOpaqueToken(6)}`,
        eventType,
        severity,
        actorId: memberId,
        entityType: "member_account",
        entityId: memberId,
        ipHash: hashRequestIp(request),
        userAgentHash: hashUserAgent(request),
        summary,
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
      });
      data.securityEvents = data.securityEvents.slice(0, 2000);
    });
  }
}

export const memberIdentityService = new MemberIdentityService();

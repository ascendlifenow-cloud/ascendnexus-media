import type { AdminUser, AdminUserResponse } from "../../models/auth/AdminUserModel";
import { sanitizeAdminUser } from "../../models/auth/AdminUserModel";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { normalizeEmail } from "../../utils/auth/passwordPolicyUtils";
import { authorizationService } from "./AuthorizationService";
import { passwordService } from "./PasswordService";
import { adminSessionService } from "./AdminSessionService";
import { jsonDatabase } from "../media/JsonDatabase";

interface CreateAdminUserInput {
  email: string;
  displayName: string;
  password: string;
  roles?: string[];
  createdBy?: string;
  accountType?: AdminUser["accountType"];
}

interface UpdateAdminUserInput {
  displayName?: string;
  status?: AdminUser["status"];
  roles?: string[];
  updatedBy?: string;
}

const newUserId = () => `admin-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class AdminUserService {
  toResponse(user: AdminUser, includePermissions = true): AdminUserResponse {
    return sanitizeAdminUser(user, includePermissions ? authorizationService.getEffectivePermissions(user) : undefined);
  }

  async listUsers(): Promise<AdminUserResponse[]> {
    const data = await jsonDatabase.read();
    return data.adminUsers.map((user) => this.toResponse(user)).sort((a, b) => a.email.localeCompare(b.email));
  }

  async getUserById(userId: string): Promise<AdminUser | null> {
    const data = await jsonDatabase.read();
    return data.adminUsers.find((user) => user.userId === userId) ?? null;
  }

  async getUserByEmail(email: string): Promise<AdminUser | null> {
    const normalizedEmail = normalizeEmail(email);
    const data = await jsonDatabase.read();
    return data.adminUsers.find((user) => user.normalizedEmail === normalizedEmail) ?? null;
  }

  async requireUser(userId: string): Promise<AdminUser> {
    const user = await this.getUserById(userId);
    if (!user) throw new AuthApiError("AUTH_USER_NOT_FOUND", "Admin user was not found.");
    return user;
  }

  async createUser(input: CreateAdminUserInput): Promise<AdminUserResponse> {
    const normalizedEmail = normalizeEmail(input.email);
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) throw new AuthApiError("AUTH_EMAIL_ALREADY_EXISTS", "An admin user with this email already exists.");
    const roles = input.roles?.length ? input.roles : ["viewer"];
    const roleValidation = authorizationService.validateRoleAssignment({ roles: ["super_admin"] } as AdminUser, roles);
    if (!roleValidation.valid) throw new AuthApiError("AUTH_ROLE_INVALID", roleValidation.errors.join(" "));
    const policy = passwordService.validatePasswordPolicy(input.password, { email: normalizedEmail, displayName: input.displayName });
    if (!policy.valid) throw new AuthApiError("AUTH_PASSWORD_POLICY_FAILED", policy.errors.join(" "));
    const now = new Date().toISOString();
    const user: AdminUser = {
      userId: newUserId(),
      email: input.email.trim(),
      normalizedEmail,
      displayName: input.displayName.trim() || normalizedEmail,
      accountType: input.accountType ?? (roles.includes("super_admin") ? "super_administrator" : "administrator"),
      passwordHash: passwordService.hashPassword(input.password),
      status: "active",
      roles,
      emailVerified: true,
      emailVerifiedAt: now,
      activatedAt: now,
      failedLoginCount: 0,
      passwordChangedAt: now,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await jsonDatabase.update((data) => {
      data.adminUsers.push(user);
    });
    return this.toResponse(user);
  }

  async createPendingActivation(input: Omit<CreateAdminUserInput, "password">): Promise<AdminUserResponse> {
    const normalizedEmail = normalizeEmail(input.email);
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) throw new AuthApiError("AUTH_EMAIL_ALREADY_EXISTS", "An admin user with this email already exists.");
    const roles = input.roles?.length ? input.roles : ["viewer"];
    const roleValidation = authorizationService.validateRoleAssignment({ roles: ["super_admin"] } as AdminUser, roles);
    if (!roleValidation.valid) throw new AuthApiError("AUTH_ROLE_INVALID", roleValidation.errors.join(" "));
    const now = new Date().toISOString();
    const user: AdminUser = {
      userId: newUserId(),
      email: input.email.trim(),
      normalizedEmail,
      displayName: input.displayName.trim() || normalizedEmail,
      accountType: input.accountType ?? (roles.includes("super_admin") ? "super_administrator" : "administrator"),
      passwordHash: passwordService.hashPassword(`pending-${newUserId()}-${Date.now()}`),
      status: "pending_activation",
      roles,
      emailVerified: false,
      failedLoginCount: 0,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await jsonDatabase.update((data) => {
      data.adminUsers.push(user);
    });
    return this.toResponse(user);
  }

  async updateUser(userId: string, input: UpdateAdminUserInput): Promise<AdminUserResponse> {
    let updated: AdminUser | undefined;
    await jsonDatabase.update((data) => {
      const user = data.adminUsers.find((item) => item.userId === userId);
      if (!user) return;
      if (input.displayName !== undefined) user.displayName = input.displayName.trim() || user.displayName;
      if (input.status !== undefined) user.status = input.status;
      if (input.roles !== undefined) {
        const roleValidation = authorizationService.validateRoleAssignment({ roles: ["super_admin"] } as AdminUser, input.roles);
        if (!roleValidation.valid) throw new AuthApiError("AUTH_ROLE_INVALID", roleValidation.errors.join(" "));
        user.roles = input.roles;
      }
      user.updatedBy = input.updatedBy;
      user.updatedAt = new Date().toISOString();
      updated = user;
    });
    if (!updated) throw new AuthApiError("AUTH_USER_NOT_FOUND", "Admin user was not found.");
    return this.toResponse(updated);
  }

  async setDisabled(userId: string, disabled: boolean, actorId?: string, reason?: string): Promise<AdminUserResponse> {
    const user = await this.updateUser(userId, {
      status: disabled ? "disabled" : "active",
      updatedBy: actorId,
    });
    if (disabled) {
      await jsonDatabase.update((data) => {
        const target = data.adminUsers.find((item) => item.userId === userId);
        if (target) {
          target.disabledAt = new Date().toISOString();
          target.disabledBy = actorId;
          target.disableReason = reason;
        }
      });
      await adminSessionService.revokeUserSessions(userId, actorId, "user_disabled");
    }
    return user;
  }

  async unlockUser(userId: string, actorId?: string): Promise<AdminUserResponse> {
    await jsonDatabase.update((data) => {
      const user = data.adminUsers.find((item) => item.userId === userId);
      if (!user) return;
      user.status = user.status === "locked" ? "active" : user.status;
      user.failedLoginCount = 0;
      user.lockedUntil = undefined;
      user.updatedBy = actorId;
      user.updatedAt = new Date().toISOString();
    });
    return this.toResponse(await this.requireUser(userId));
  }

  async setPassword(userId: string, password: string, actorId?: string): Promise<AdminUserResponse> {
    const user = await this.requireUser(userId);
    const policy = passwordService.validatePasswordPolicy(password, { email: user.email, displayName: user.displayName });
    if (!policy.valid) throw new AuthApiError("AUTH_PASSWORD_POLICY_FAILED", policy.errors.join(" "));
    await jsonDatabase.update((data) => {
      const target = data.adminUsers.find((item) => item.userId === userId);
      if (!target) return;
      target.passwordHash = passwordService.hashPassword(password);
      target.passwordChangedAt = new Date().toISOString();
      target.failedLoginCount = 0;
      target.lockedUntil = undefined;
      target.updatedBy = actorId;
      target.updatedAt = new Date().toISOString();
    });
    await adminSessionService.revokeUserSessions(userId, actorId, "password_changed");
    return this.toResponse(await this.requireUser(userId));
  }

  async recordSuccessfulLogin(userId: string, ipHash?: string): Promise<void> {
    await jsonDatabase.update((data) => {
      const user = data.adminUsers.find((item) => item.userId === userId);
      if (!user) return;
      user.lastLoginAt = new Date().toISOString();
      user.lastLoginIpHash = ipHash;
      user.failedLoginCount = 0;
      user.lockedUntil = undefined;
      user.updatedAt = new Date().toISOString();
    });
  }

  async recordFailedLogin(userId: string): Promise<void> {
    await jsonDatabase.update((data) => {
      const user = data.adminUsers.find((item) => item.userId === userId);
      if (!user) return;
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 8) {
        user.status = "locked";
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      user.updatedAt = new Date().toISOString();
    });
  }
}

export const adminUserService = new AdminUserService();

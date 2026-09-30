export type AdminUserStatus = "pending" | "pending_activation" | "active" | "locked" | "disabled" | "deleted" | "archived";
export type AdminAccountType = "member" | "staff" | "administrator" | "super_administrator";

export interface AdminUser {
  userId: string;
  email: string;
  normalizedEmail: string;
  displayName: string;
  accountType?: AdminAccountType;
  passwordHash: string;
  status: AdminUserStatus;
  roles: string[];
  directPermissions?: string[];
  emailVerified: boolean;
  emailVerifiedAt?: string;
  activatedAt?: string;
  lastLoginAt?: string;
  lastLoginIpHash?: string;
  passwordChangedAt?: string;
  failedLoginCount: number;
  lockedUntil?: string;
  disabledAt?: string;
  disabledBy?: string;
  disableReason?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AdminUserResponse {
  userId: string;
  email: string;
  displayName: string;
  status: AdminUserStatus;
  accountType?: AdminAccountType;
  roles: string[];
  permissions?: string[];
  emailVerified: boolean;
  lastLoginAt?: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export const sanitizeAdminUser = (user: AdminUser, permissions?: string[]): AdminUserResponse => ({
  userId: user.userId,
  email: user.email,
  displayName: user.displayName,
  status: user.status,
  accountType: user.accountType,
  roles: user.roles,
  permissions,
  emailVerified: user.emailVerified,
  lastLoginAt: user.lastLoginAt,
  lockedUntil: user.lockedUntil,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

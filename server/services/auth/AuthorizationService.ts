import type { AdminUser } from "../../models/auth/AdminUserModel";
import { allAdminPermissionNames } from "../../constants/auth/permissions";
import { systemRoles } from "../../constants/auth/systemRoles";

export class AuthorizationService {
  getRolePermissions(roleIds: readonly string[]): string[] {
    const permissions = new Set<string>();
    for (const roleId of roleIds) {
      const role = systemRoles.find((item) => item.roleId === roleId && item.status === "active");
      role?.permissions.forEach((permission) => permissions.add(permission));
    }
    return [...permissions];
  }

  getEffectivePermissions(user: AdminUser): string[] {
    return [...new Set([...this.getRolePermissions(user.roles), ...(user.directPermissions ?? [])])];
  }

  hasPermission(user: AdminUser, permission: string): boolean {
    return this.getEffectivePermissions(user).includes(permission);
  }

  hasAnyPermission(user: AdminUser, permissions: readonly string[]): boolean {
    return permissions.some((permission) => this.hasPermission(user, permission));
  }

  hasAllPermissions(user: AdminUser, permissions: readonly string[]): boolean {
    return permissions.every((permission) => this.hasPermission(user, permission));
  }

  validateRoleAssignment(_actor: AdminUser, roleIds: readonly string[]): { valid: boolean; errors: string[] } {
    const validRoleIds = new Set(systemRoles.map((role) => role.roleId));
    const errors = roleIds.filter((roleId) => !validRoleIds.has(roleId)).map((roleId) => `Unknown role: ${roleId}`);
    return { valid: errors.length === 0, errors };
  }

  isKnownPermission(permission: string): boolean {
    return allAdminPermissionNames.includes(permission);
  }

  invalidatePermissionCache(_userId: string): void {
    // Permission resolution is intentionally stateless in the JSON-backed foundation.
  }
}

export const authorizationService = new AuthorizationService();

import { allAdminPermissionNames } from "../../constants/auth/permissions";
import { systemRoles } from "../../constants/auth/systemRoles";
import { authorizationService } from "./AuthorizationService";
import { adminUserService } from "./AdminUserService";

const requiredAdminPermissions = [
  "admin.access",
  "artists.read",
  "artists.create",
  "artists.update",
  "artists.delete",
  "releases.read",
  "releases.create",
  "releases.update",
  "releases.delete",
  "media.read",
  "media.upload",
  "media.update",
  "media.delete",
  "gallery.read",
  "gallery.update",
  "homepage.read",
  "homepage.update",
  "publication.read",
  "publication.publish",
  "publication.rollback",
  "contact.read",
  "newsletter.read",
  "analytics.read",
  "seo.read",
  "security.read",
  "deployment.read",
  "observability.read",
  "users.read",
  "roles.read",
  "roles.manage",
];

export class AdminPermissionVerificationService {
  getRequiredAdminPermissions() {
    return requiredAdminPermissions;
  }

  inspectDefinedPermissions() {
    return allAdminPermissionNames;
  }

  inspectRoleMappings() {
    return systemRoles.map((role) => ({
      roleId: role.roleId,
      status: role.status,
      permissionCount: role.permissions.length,
      hasAdminAccess: role.permissions.includes("admin.access"),
      invalidPermissions: role.permissions.filter((permission) => !authorizationService.isKnownPermission(permission)),
    }));
  }

  findMissingPermissions() {
    return requiredAdminPermissions.filter((permission) => !allAdminPermissionNames.includes(permission));
  }

  findInvalidRoleMappings() {
    return this.inspectRoleMappings().filter((role) => role.invalidPermissions.length > 0);
  }

  async verifyAdministratorAccess(userId: string) {
    const user = await adminUserService.getUserById(userId);
    if (!user) return { userId, valid: false, errors: ["User not found."] };
    const permissions = authorizationService.getEffectivePermissions(user);
    return {
      userId,
      valid: user.status === "active" && permissions.includes("admin.access"),
      status: user.status,
      roles: user.roles,
      permissions,
      errors: [
        ...(user.status !== "active" ? [`User status is ${user.status}.`] : []),
        ...(!permissions.includes("admin.access") ? ["Missing admin.access."] : []),
      ],
    };
  }

  async buildPermissionReport() {
    const users = await adminUserService.listUsers();
    const missingPermissions = this.findMissingPermissions();
    const invalidRoleMappings = this.findInvalidRoleMappings();
    return {
      valid: missingPermissions.length === 0 && invalidRoleMappings.length === 0,
      requiredPermissions: requiredAdminPermissions,
      definedPermissionCount: allAdminPermissionNames.length,
      missingPermissions,
      roleMappings: this.inspectRoleMappings(),
      invalidRoleMappings,
      activeAdminUsers: users.filter((user) => user.status === "active" && (user.permissions ?? []).includes("admin.access")).length,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const adminPermissionVerificationService = new AdminPermissionVerificationService();

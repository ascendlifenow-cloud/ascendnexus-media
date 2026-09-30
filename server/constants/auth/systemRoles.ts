import type { AdminRole } from "../../models/auth/AdminRoleModel";
import { allAdminPermissionNames } from "./permissions";

const now = "system";

const role = (roleId: string, displayName: string, description: string, permissions: string[]): AdminRole => ({
  roleId,
  name: roleId,
  displayName,
  description,
  permissions,
  systemRole: true,
  status: "active",
  createdAt: now,
  updatedAt: now,
});

const contentPermissions = allAdminPermissionNames.filter((permission) =>
  /^(artists|releases|gallery|homepage|metadata)\./.test(permission) || permission.endsWith(".read"),
);
const withAdminAccess = (permissions: string[]) => [...new Set(["admin.access", ...permissions])];

export const systemRoles = [
  role("super_admin", "Super Admin", "Full administrative access.", allAdminPermissionNames),
  role("admin", "Admin", "Broad operational access without low-level role management.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission !== "roles.manage"))),
  role("content_manager", "Content Manager", "Manage artists, releases, gallery, homepage, and metadata.", withAdminAccess(contentPermissions)),
  role("media_manager", "Media Manager", "Manage media library and processing review.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.startsWith("media.") || permission === "system.health.read"))),
  role("publisher", "Publisher", "Publish and unpublish approved content.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.includes(".read") || permission.startsWith("publication.") || /\.(publish|unpublish|archive|restore)$/.test(permission)))),
  role("editor", "Editor", "Create and edit drafts without publication rights.", withAdminAccess(allAdminPermissionNames.filter((permission) => /\.(read|create|update)$/.test(permission)))),
  role("viewer", "Viewer", "Read-only admin access.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.endsWith(".read")))),
  role("read_only_admin", "Read Only Admin", "Read-only administrative access.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.endsWith(".read")))),
  role("support", "Support", "Support access for forms, users, and read-only diagnostics.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.endsWith(".read") || permission.startsWith("contact") || permission.startsWith("newsletter")))),
  role("security_admin", "Security Admin", "Security and user-access administration.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.startsWith("security.") || permission.startsWith("users.") || permission.startsWith("roles.") || permission.startsWith("audit.") || permission.startsWith("launch_security.") || permission.startsWith("launch_final.")))),
  role("deployment_admin", "Deployment Admin", "Deployment, observability, and reliability administration.", withAdminAccess(allAdminPermissionNames.filter((permission) => permission.startsWith("deployment.") || permission.startsWith("observability.") || permission.startsWith("reliability.") || permission.startsWith("launch.") || permission.startsWith("launch_")))),
] as const satisfies AdminRole[];

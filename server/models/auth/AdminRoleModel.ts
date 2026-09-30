export type AdminRoleStatus = "active" | "disabled" | "archived";
export type AdminPermissionRiskLevel = "low" | "medium" | "high" | "critical";

export interface AdminPermission {
  permissionId: string;
  name: string;
  description: string;
  category: string;
  riskLevel: AdminPermissionRiskLevel;
  metadata?: Record<string, unknown>;
}

export interface AdminRole {
  roleId: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  systemRole: boolean;
  status: AdminRoleStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

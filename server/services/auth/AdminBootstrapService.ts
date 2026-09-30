import { getBackendConfig } from "../../config/backendConfig";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { adminRoleService } from "./AdminRoleService";
import { adminUserService } from "./AdminUserService";
import { adminActivationService } from "./AdminActivationService";
import { jsonDatabase } from "../media/JsonDatabase";

export class AdminBootstrapService {
  async initializeRoles() {
    return adminRoleService.initializeRoles();
  }

  async getBootstrapState() {
    const data = await jsonDatabase.read();
    const activeSuperAdmins = data.adminUsers.filter((user) => user.roles.includes("super_admin") && user.status === "active");
    const pendingSuperAdmins = data.adminUsers.filter((user) => user.roles.includes("super_admin") && (user.status === "pending" || user.status === "pending_activation"));
    return {
      bootstrapRequired: activeSuperAdmins.length === 0,
      bootstrapCompleted: activeSuperAdmins.length > 0,
      activeSuperAdminCount: activeSuperAdmins.length,
      pendingSuperAdminCount: pendingSuperAdmins.length,
      checkedAt: new Date().toISOString(),
    };
  }

  async bootstrapInitialAdmin(input: { email: string; displayName?: string; password?: string; force?: boolean; showToken?: boolean }) {
    const config = getBackendConfig();
    const data = await jsonDatabase.read();
    const hasSuperAdmin = data.adminUsers.some((user) => user.roles.includes("super_admin") && user.status !== "archived");
    if (hasSuperAdmin && !input.force) throw new AuthApiError("AUTH_BOOTSTRAP_NOT_ALLOWED", "Initial super admin already exists.");
    if (!config.auth.initialAdminBootstrapEnabled && !config.app.isDevelopment && !config.app.isTest && !input.force) {
      throw new AuthApiError("AUTH_BOOTSTRAP_NOT_ALLOWED", "Initial admin bootstrap is disabled.");
    }
    await this.initializeRoles();
    if (input.password && (config.app.isDevelopment || config.app.isTest || input.force)) {
      return { mode: "direct_password", user: await adminUserService.createUser({
        email: input.email,
        displayName: input.displayName ?? input.email,
        password: input.password,
        roles: ["super_admin"],
        createdBy: "bootstrap",
        accountType: "super_administrator",
      }) };
    }
    const user = await adminUserService.createPendingActivation({
      email: input.email,
      displayName: input.displayName ?? input.email,
      roles: ["super_admin"],
      createdBy: "bootstrap",
      accountType: "super_administrator",
    });
    const activation = await adminActivationService.createActivationToken(user.userId, "bootstrap");
    await jsonDatabase.update((records) => {
      records.adminBootstrapStates.push({
        bootstrapStateId: `bootstrap-${Date.now()}`,
        bootstrapRequired: false,
        bootstrapCompleted: false,
        initialAdministratorId: user.userId,
        completedByMethod: "cli_activation",
        bootstrapVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { activationTokenId: activation.activationTokenId },
      });
    });
    await mediaAuditPersistenceService.record("admin_bootstrap_started", "Initial admin bootstrap started.", {
      actorId: user.userId,
      entityType: "admin_user",
      entityId: user.userId,
    });
    return {
      mode: "activation_token",
      user,
      activation: {
        activationTokenId: activation.activationTokenId,
        expiresAt: activation.expiresAt,
        setupToken: input.showToken || config.app.isDevelopment || config.app.isTest ? activation.setupToken : undefined,
      },
    };
  }
}

export const adminBootstrapService = new AdminBootstrapService();

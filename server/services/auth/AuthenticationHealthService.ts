import { getBackendConfig } from "../../config/backendConfig";
import { jsonDatabase } from "../media/JsonDatabase";
import { adminPermissionVerificationService } from "./AdminPermissionVerificationService";

export class AuthenticationHealthService {
  async getHealth() {
    const config = getBackendConfig();
    const data = await jsonDatabase.read();
    const activeUsers = data.adminUsers.filter((user) => user.status === "active").length;
    const superAdmins = data.adminUsers.filter((user) => user.status === "active" && user.roles.includes("super_admin")).length;
    const permissionReport = await adminPermissionVerificationService.buildPermissionReport();
    const activeSessions = data.adminSessions.filter((session) => session.status === "active" && Date.parse(session.expiresAt) > Date.now()).length;
    const bootstrapRequired = superAdmins === 0;
    const errors = [
      ...(!config.auth.enabled ? ["Authentication is disabled."] : []),
      ...(permissionReport.missingPermissions.length ? [`Missing permissions: ${permissionReport.missingPermissions.join(", ")}`] : []),
    ];
    const warnings = [
      ...(superAdmins === 0 ? ["No active super admin exists."] : []),
      ...(!config.auth.sessionSecret && (config.app.isProduction || config.app.isStaging) ? ["AUTH_SESSION_SECRET is required outside local development."] : []),
      ...(!config.security.csrfEnabled ? ["CSRF enforcement is not enabled in this environment."] : []),
      ...["Admin MFA is not implemented locally; ANM-WEB-102 keeps production privileged access approved only with exception or external MFA."],
    ];
    return {
      status: errors.length ? "unavailable" : warnings.length ? "degraded" : "healthy",
      overallStatus: errors.length ? "unavailable" : warnings.length ? "degraded" : "healthy",
      configured: config.auth.enabled,
      authEnabled: config.auth.enabled,
      provider: config.auth.provider,
      authMode: "server_session_http_only_cookie",
      cookieName: config.auth.cookieName,
      cookieSecure: config.auth.cookieSecure,
      cookieSameSite: config.auth.cookieSameSite,
      passwordResetEnabled: config.auth.passwordResetEnabled,
      adminUserExists: activeUsers > 0,
      bootstrapRequired,
      activeUsers,
      superAdmins,
      activeSessions,
      rolesReady: permissionReport.invalidRoleMappings.length === 0,
      permissionsReady: permissionReport.missingPermissions.length === 0,
      sessionStoreReady: true,
      cookiePolicyReady: !config.app.isProduction || config.auth.cookieSecure,
      csrfReady: config.security.csrfEnabled || !config.app.isProduction,
      corsReady: !config.app.isProduction || config.server.corsAllowedOrigins.length > 0,
      trustedProxyReady: config.server.trustProxy || !config.app.isProduction,
      passwordResetReady: config.auth.passwordResetEnabled || !config.app.isProduction,
      emailReady: config.email.enabled || !config.app.isProduction,
      mfaReady: false,
      permissionReport,
      checkedAt: new Date().toISOString(),
      warnings,
      errors,
    };
  }
}

export const authenticationHealthService = new AuthenticationHealthService();

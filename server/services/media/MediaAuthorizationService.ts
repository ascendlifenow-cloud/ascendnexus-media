import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { allAdminPermissionNames } from "../../constants/auth/permissions";
import { authenticationService } from "../auth/AuthenticationService";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";

export interface AdminAuthContext {
  adminId: string;
  userId?: string;
  email?: string;
  displayName?: string;
  permissions: string[];
  roles?: string[];
  sessionId?: string;
}

export class MediaAuthorizationService {
  async authenticate(request: IncomingMessage): Promise<AdminAuthContext> {
    const auth = request.headers.authorization ?? "";
    const devHeader = request.headers["x-admin-dev-token"];
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : typeof devHeader === "string" ? devHeader : "";
    const config = getBackendConfig();
    const localDevBypassAllowed = !config.app.isProduction && !config.app.isStaging;
    if (localDevBypassAllowed && (config.auth.authDisabled || process.env.MEDIA_AUTH_DISABLED === "true" || token === mediaBackendConfig.devAdminToken)) {
      return {
        adminId: "dev-admin",
        userId: "dev-admin",
        email: "dev-admin@local.test",
        displayName: "Development Admin",
        roles: ["super_admin"],
        permissions: [...allAdminPermissionNames],
      };
    }
    const context = await authenticationService.authenticateRequest(request);
    return {
      adminId: context.user.userId,
      userId: context.user.userId,
      email: context.user.email,
      displayName: context.user.displayName,
      roles: context.user.roles,
      permissions: context.permissions,
      sessionId: context.sessionId,
    };
  }

  requirePermission(context: AdminAuthContext, permission: string): void {
    if (!context.permissions.includes(permission)) {
      throw new MediaApiError("MEDIA_PERMISSION_DENIED", "You do not have permission for this media action.", 403, "auth");
    }
  }
}

export const mediaAuthorizationService = new MediaAuthorizationService();

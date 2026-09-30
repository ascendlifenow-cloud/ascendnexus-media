import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { adminSessionService } from "../services/auth/AdminSessionService";
import { adminUserService } from "../services/auth/AdminUserService";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";

export class AdminUserController {
  async list(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: await adminUserService.listUsers() });
  }

  async create(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.create");
    const body = await parseJsonBody(request) as { email?: string; displayName?: string; password?: string; roles?: string[] };
    const user = await adminUserService.createUser({
      email: body.email ?? "",
      displayName: body.displayName ?? body.email ?? "",
      password: body.password ?? "",
      roles: Array.isArray(body.roles) ? body.roles : ["viewer"],
      createdBy: auth.adminId,
    });
    await mediaAuditPersistenceService.record("admin_user_created", `Created admin user ${user.email}`, { actorId: auth.adminId, entityType: "admin_user", entityId: user.userId });
    sendJson(response, 201, { success: true, data: user });
  }

  async get(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: adminUserService.toResponse(await adminUserService.requireUser(userId)) });
  }

  async update(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.update");
    const body = await parseJsonBody(request) as { displayName?: string; status?: never; roles?: string[] };
    if (body.roles) mediaAuthorizationService.requirePermission(auth, "users.assign_roles");
    const user = await adminUserService.updateUser(userId, {
      displayName: body.displayName,
      roles: Array.isArray(body.roles) ? body.roles : undefined,
      updatedBy: auth.adminId,
    });
    await mediaAuditPersistenceService.record("admin_user_updated", `Updated admin user ${user.email}`, { actorId: auth.adminId, entityType: "admin_user", entityId: user.userId });
    sendJson(response, 200, { success: true, data: user });
  }

  async disable(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.disable");
    const body = await parseJsonBody(request).catch(() => ({})) as { reason?: string };
    const user = await adminUserService.setDisabled(userId, true, auth.adminId, body.reason);
    await mediaAuditPersistenceService.record("admin_user_disabled", `Disabled admin user ${user.email}`, { actorId: auth.adminId, entityType: "admin_user", entityId: user.userId });
    sendJson(response, 200, { success: true, data: user });
  }

  async restore(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.restore");
    const user = await adminUserService.setDisabled(userId, false, auth.adminId);
    await mediaAuditPersistenceService.record("admin_user_restored", `Restored admin user ${user.email}`, { actorId: auth.adminId, entityType: "admin_user", entityId: user.userId });
    sendJson(response, 200, { success: true, data: user });
  }

  async unlock(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.update");
    sendJson(response, 200, { success: true, data: await adminUserService.unlockUser(userId, auth.adminId) });
  }

  async resetPassword(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.reset_password");
    const body = await parseJsonBody(request) as { password?: string };
    const user = await adminUserService.setPassword(userId, body.password ?? "", auth.adminId);
    await mediaAuditPersistenceService.record("admin_user_password_reset", `Reset password for admin user ${user.email}`, { actorId: auth.adminId, entityType: "admin_user", entityId: user.userId });
    sendJson(response, 200, { success: true, data: user });
  }

  async sessions(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: await adminSessionService.listUserSessions(userId) });
  }

  async revokeSessions(request: IncomingMessage, response: ServerResponse, userId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.update");
    await adminSessionService.revokeUserSessions(userId, auth.adminId, "admin_revoked_user_sessions");
    sendJson(response, 200, { success: true });
  }
}

export const adminUserController = new AdminUserController();

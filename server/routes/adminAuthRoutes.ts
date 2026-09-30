import type { IncomingMessage, ServerResponse } from "node:http";
import { adminAuthController } from "../controllers/adminAuthController";
import { adminUserController } from "../controllers/adminUserController";
import { sendJson } from "../middleware/mediaErrorMiddleware";

export const handleAdminAuthRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method === "OPTIONS" && path.startsWith("/api/admin")) {
    sendJson(response, 204, {});
    return true;
  }

  if (method === "GET" && path === "/api/auth/admin/availability") return adminAuthController.availability(request, response).then(() => true);
  if (method === "POST" && (path === "/api/admin/auth/login" || path === "/api/auth/admin/login")) return adminAuthController.login(request, response).then(() => true);
  if (method === "GET" && (path === "/api/admin/auth/session" || path === "/api/auth/session")) return adminAuthController.session(request, response).then(() => true);
  if (method === "POST" && (path === "/api/admin/auth/logout" || path === "/api/auth/logout")) return adminAuthController.logout(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/auth/logout-all") return adminAuthController.logoutAll(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/auth/sessions") return adminAuthController.sessions(request, response).then(() => true);
  const sessionRevokeMatch = /^\/api\/admin\/auth\/sessions\/([^/]+)$/.exec(path);
  if (method === "DELETE" && sessionRevokeMatch) return adminAuthController.revokeSession(request, response, sessionRevokeMatch[1]).then(() => true);
  if (method === "POST" && path === "/api/admin/auth/change-password") return adminAuthController.changePassword(request, response).then(() => true);
  if (method === "POST" && (path === "/api/admin/auth/password-reset/request" || path === "/api/auth/admin/password-reset/request")) return adminAuthController.requestPasswordReset(request, response).then(() => true);
  if (method === "POST" && (path === "/api/admin/auth/password-reset/complete" || path === "/api/auth/admin/password-reset/complete")) return adminAuthController.completePasswordReset(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/admin/activate") return adminAuthController.activate(request, response).then(() => true);
  if (method === "GET" && (path === "/api/admin/auth/health" || path === "/api/auth/admin/health")) return adminAuthController.health(request, response).then(() => true);
  if (method === "GET" && path === "/api/auth/admin/bootstrap-status") return adminAuthController.bootstrapStatus(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/auth/initialize") return adminAuthController.initialize(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/roles") return adminAuthController.roles(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/permissions") return adminAuthController.permissions(request, response).then(() => true);

  if (method === "GET" && path === "/api/admin/users") return adminUserController.list(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/users") return adminUserController.create(request, response).then(() => true);
  const userMatch = /^\/api\/admin\/users\/([^/]+)$/.exec(path);
  if (method === "GET" && userMatch) return adminUserController.get(request, response, userMatch[1]).then(() => true);
  if (method === "PATCH" && userMatch) return adminUserController.update(request, response, userMatch[1]).then(() => true);
  const disableMatch = /^\/api\/admin\/users\/([^/]+)\/disable$/.exec(path);
  if (method === "POST" && disableMatch) return adminUserController.disable(request, response, disableMatch[1]).then(() => true);
  const restoreMatch = /^\/api\/admin\/users\/([^/]+)\/restore$/.exec(path);
  if (method === "POST" && restoreMatch) return adminUserController.restore(request, response, restoreMatch[1]).then(() => true);
  const unlockMatch = /^\/api\/admin\/users\/([^/]+)\/unlock$/.exec(path);
  if (method === "POST" && unlockMatch) return adminUserController.unlock(request, response, unlockMatch[1]).then(() => true);
  const resetMatch = /^\/api\/admin\/users\/([^/]+)\/password-reset$/.exec(path);
  if (method === "POST" && resetMatch) return adminUserController.resetPassword(request, response, resetMatch[1]).then(() => true);
  const userSessionsMatch = /^\/api\/admin\/users\/([^/]+)\/sessions$/.exec(path);
  if (method === "GET" && userSessionsMatch) return adminUserController.sessions(request, response, userSessionsMatch[1]).then(() => true);
  if (method === "POST" && userSessionsMatch) return adminUserController.revokeSessions(request, response, userSessionsMatch[1]).then(() => true);

  return false;
};

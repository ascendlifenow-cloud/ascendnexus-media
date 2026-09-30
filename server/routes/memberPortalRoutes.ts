import type { IncomingMessage, ServerResponse } from "node:http";
import { memberPortalController } from "../controllers/memberPortalController";

export const handleMemberPortalRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "GET" && path === "/api/member/dashboard") return memberPortalController.dashboard(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/profile") return memberPortalController.profile(request, response).then(() => true);
  if (method === "PATCH" && path === "/api/member/profile") return memberPortalController.updateProfile(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/preferences") return memberPortalController.preferences(request, response).then(() => true);
  if (method === "PATCH" && path === "/api/member/preferences") return memberPortalController.updatePreferences(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/membership") return memberPortalController.membership(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/early-access") return memberPortalController.earlyAccess(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/exclusive-content") return memberPortalController.exclusiveContent(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/recommendations") return memberPortalController.recommendations(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/announcements") return memberPortalController.announcements(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/sessions") return memberPortalController.sessions(request, response).then(() => true);
  if (method === "POST" && path === "/api/member/sessions/revoke-others") return memberPortalController.revokeOtherSessions(request, response).then(() => true);
  const sessionMatch = /^\/api\/member\/sessions\/([^/]+)$/.exec(path);
  if (method === "DELETE" && sessionMatch) return memberPortalController.revokeSession(request, response, sessionMatch[1]).then(() => true);

  if (method === "GET" && (path === "/api/admin/member-experience/health" || path === "/api/admin/member-experience/overview")) return memberPortalController.adminHealth(request, response).then(() => true);

  return false;
};

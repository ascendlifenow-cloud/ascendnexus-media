import type { IncomingMessage, ServerResponse } from "node:http";
import { adminMemberCrmController } from "../controllers/adminMemberCrmController";

export const handleAdminMemberCrmRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "GET" && (path === "/api/admin/member-crm" || path === "/api/admin/member-search")) return (path.endsWith("search") ? adminMemberCrmController.search(request, response, url) : adminMemberCrmController.dashboard(request, response)).then(() => true);
  if (method === "GET" && path === "/api/admin/member-health") return adminMemberCrmController.health(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/member-reports") return adminMemberCrmController.report(request, response).then(() => true);

  const memberMatch = /^\/api\/admin\/members\/([^/]+)$/.exec(path);
  if (method === "GET" && memberMatch) return adminMemberCrmController.detail(request, response, memberMatch[1]).then(() => true);
  if (method === "PATCH" && memberMatch) return adminMemberCrmController.setStatus(request, response, memberMatch[1]).then(() => true);

  const timelineMatch = /^\/api\/admin\/members\/([^/]+)\/timeline$/.exec(path);
  if (method === "GET" && timelineMatch) return adminMemberCrmController.timeline(request, response, timelineMatch[1]).then(() => true);
  const healthMatch = /^\/api\/admin\/members\/([^/]+)\/health$/.exec(path);
  if (method === "GET" && healthMatch) return adminMemberCrmController.health(request, response, healthMatch[1]).then(() => true);
  const riskMatch = /^\/api\/admin\/members\/([^/]+)\/risk$/.exec(path);
  if (method === "GET" && riskMatch) return adminMemberCrmController.risk(request, response, riskMatch[1]).then(() => true);

  const grantMatch = /^\/api\/admin\/members\/([^/]+)\/membership\/grant$/.exec(path);
  if (method === "POST" && grantMatch) return adminMemberCrmController.grantMembership(request, response, grantMatch[1]).then(() => true);
  const revokeMembershipMatch = /^\/api\/admin\/members\/([^/]+)\/membership\/revoke$/.exec(path);
  if (method === "POST" && revokeMembershipMatch) return adminMemberCrmController.revokeMembership(request, response, revokeMembershipMatch[1]).then(() => true);

  const sessionsMatch = /^\/api\/admin\/members\/([^/]+)\/sessions$/.exec(path);
  if (method === "GET" && sessionsMatch) return adminMemberCrmController.sessions(request, response, sessionsMatch[1]).then(() => true);
  if (method === "POST" && sessionsMatch) return adminMemberCrmController.revokeSession(request, response, sessionsMatch[1]).then(() => true);
  const sessionMatch = /^\/api\/admin\/members\/([^/]+)\/sessions\/([^/]+)\/revoke$/.exec(path);
  if (method === "POST" && sessionMatch) return adminMemberCrmController.revokeSession(request, response, sessionMatch[1], sessionMatch[2]).then(() => true);

  const supportMatch = /^\/api\/admin\/members\/([^/]+)\/support-notes$/.exec(path);
  if (method === "POST" && supportMatch) return adminMemberCrmController.supportNote(request, response, supportMatch[1]).then(() => true);
  const moderationMatch = /^\/api\/admin\/members\/([^/]+)\/moderation$/.exec(path);
  if (method === "POST" && moderationMatch) return adminMemberCrmController.moderation(request, response, moderationMatch[1]).then(() => true);

  if (method === "GET" && ["/api/admin/member-activity", "/api/admin/member-security", "/api/admin/member-support", "/api/admin/member-notifications", "/api/admin/member-subscriptions", "/api/admin/member-entitlements", "/api/admin/member-sessions", "/api/admin/member-risk", "/api/admin/member-moderation"].includes(path)) return adminMemberCrmController.dashboard(request, response).then(() => true);

  return false;
};

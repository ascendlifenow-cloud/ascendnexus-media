import type { IncomingMessage, ServerResponse } from "node:http";
import { memberAuthController } from "../controllers/memberAuthController";
import { memberIdentityService } from "../services/members/MemberIdentityService";

const wantsMemberSession = (request: IncomingMessage) =>
  request.headers["x-auth-scope"] === "member" || Boolean(memberIdentityService.getMemberSessionCookie(request));

export const handleMemberAuthRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "POST" && path === "/api/auth/register") return memberAuthController.register(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/login") return memberAuthController.login(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/logout" && wantsMemberSession(request)) return memberAuthController.logout(request, response).then(() => true);
  if (method === "GET" && path === "/api/auth/session" && wantsMemberSession(request)) return memberAuthController.session(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/verify-email") return memberAuthController.verifyEmail(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/resend-verification") return memberAuthController.resendVerification(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/password/request") return memberAuthController.requestPasswordReset(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/password/reset") return memberAuthController.resetPassword(request, response).then(() => true);
  if (method === "POST" && path === "/api/auth/change-password") return memberAuthController.changePassword(request, response).then(() => true);
  if (method === "GET" && path === "/api/account") return memberAuthController.account(request, response).then(() => true);
  if (method === "PATCH" && path === "/api/account/profile") return memberAuthController.updateProfile(request, response).then(() => true);
  if (method === "PATCH" && path === "/api/account/preferences") return memberAuthController.updatePreferences(request, response).then(() => true);
  if (method === "GET" && path === "/api/account/sessions") return memberAuthController.sessions(request, response).then(() => true);
  const accountSessionMatch = /^\/api\/account\/sessions\/([^/]+)$/.exec(path);
  if (method === "DELETE" && accountSessionMatch) return memberAuthController.revokeSession(request, response, accountSessionMatch[1]).then(() => true);
  if (method === "DELETE" && path === "/api/account") return memberAuthController.deleteAccount(request, response).then(() => true);

  if (method === "GET" && path === "/api/admin/members") return memberAuthController.adminMembers(request, response).then(() => true);
  const adminMemberMatch = /^\/api\/admin\/members\/([^/]+)$/.exec(path);
  if (method === "GET" && adminMemberMatch) return memberAuthController.adminMember(request, response, adminMemberMatch[1]).then(() => true);
  if (method === "PATCH" && adminMemberMatch) return memberAuthController.adminSetStatus(request, response, adminMemberMatch[1]).then(() => true);
  if (method === "GET" && (path === "/api/admin/member-health" || path === "/api/admin/system/member-authentication")) return memberAuthController.health(request, response).then(() => true);

  return false;
};

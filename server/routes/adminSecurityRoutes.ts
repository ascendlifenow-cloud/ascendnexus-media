import type { IncomingMessage, ServerResponse } from "node:http";
import { adminSecurityController } from "../controllers/admin/adminSecurityController";

export const handleAdminSecurityRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method === "GET" && (path === "/api/admin/security/health" || path === "/api/admin/system/security")) return adminSecurityController.health(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/security/overview") return adminSecurityController.overview(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/security/launch-decision") return adminSecurityController.launchDecision(request, response).then(() => true);
  return false;
};

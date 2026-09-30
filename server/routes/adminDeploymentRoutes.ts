import type { IncomingMessage, ServerResponse } from "node:http";
import { adminDeploymentController } from "../controllers/adminDeploymentController";

export const handleAdminDeploymentRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method === "GET" && path === "/api/admin/deployment/overview") return adminDeploymentController.overview(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/deployment/releases") return adminDeploymentController.releases(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/deployment/current") return adminDeploymentController.current(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/deployment/previous") return adminDeploymentController.previous(request, response).then(() => true);
  if (method === "GET" && (path === "/api/admin/deployment/health" || path === "/api/admin/system/health")) return adminDeploymentController.health(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/deployment/verify") return adminDeploymentController.verify(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/deployment/launch-gate") return adminDeploymentController.launchGate(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/deployment/rollback") return adminDeploymentController.rollback(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/deployment/backups/status") return adminDeploymentController.backupStatus(request, response).then(() => true);
  return false;
};

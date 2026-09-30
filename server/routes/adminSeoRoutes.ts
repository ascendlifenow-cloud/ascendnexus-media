import type { IncomingMessage, ServerResponse } from "node:http";
import { adminSeoController } from "../controllers/adminSeoController";

export const handleAdminSeoRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/api/admin/seo" && method === "GET") return adminSeoController.overview(request, response).then(() => true);
  if (path === "/api/admin/seo/health" && method === "GET") return adminSeoController.health(request, response).then(() => true);
  if (path === "/api/admin/seo/routes" && method === "GET") return adminSeoController.routes(request, response, url).then(() => true);
  if ((path === "/api/admin/seo/sitemap" || path === "/api/admin/seo/sitemap/verify") && method === "GET") return adminSeoController.sitemap(request, response).then(() => true);
  if ((path === "/api/admin/seo/robots" || path === "/api/admin/seo/robots/verify") && method === "GET") return adminSeoController.robots(request, response).then(() => true);
  if (path === "/api/admin/seo/redirects" && (method === "GET" || method === "POST")) return adminSeoController.redirects(request, response).then(() => true);
  if (path === "/api/admin/seo/search-engine-verification" && method === "GET") return adminSeoController.searchEngineVerification(request, response).then(() => true);
  if (path === "/api/admin/seo/indexing-launch-gate" && method === "GET") return adminSeoController.launchGate(request, response, url).then(() => true);
  return false;
};

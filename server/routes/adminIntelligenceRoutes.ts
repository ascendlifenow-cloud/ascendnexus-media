import type { IncomingMessage, ServerResponse } from "node:http";
import { adminIntelligenceController } from "../controllers/adminIntelligenceController";

export const handleAdminIntelligenceRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const artist = path.match(/^\/api\/admin\/intelligence\/artists\/([^/]+)$/);
  if (path === "/api/admin/intelligence/overview" && method === "GET") return adminIntelligenceController.overview(request, response).then(() => true);
  if (artist && method === "GET") return adminIntelligenceController.artist(request, response, artist[1]).then(() => true);
  if (path === "/api/admin/intelligence/audience" && method === "GET") return adminIntelligenceController.audience(request, response).then(() => true);
  if (path === "/api/admin/intelligence/trends" && (method === "GET" || method === "POST")) return adminIntelligenceController.trends(request, response).then(() => true);
  if (path === "/api/admin/intelligence/recommendations" && (method === "GET" || method === "POST")) return adminIntelligenceController.recommendations(request, response).then(() => true);
  if (path === "/api/admin/intelligence/platform-comparison" && method === "GET") return adminIntelligenceController.platforms(request, response).then(() => true);
  if (path === "/api/admin/intelligence/growth-forecast" && (method === "GET" || method === "POST")) return adminIntelligenceController.forecasts(request, response).then(() => true);
  if (path === "/api/admin/intelligence/reports" && (method === "GET" || method === "POST")) return adminIntelligenceController.reports(request, response).then(() => true);
  if (path === "/api/admin/intelligence/campaigns" && method === "GET") return adminIntelligenceController.campaigns(request, response).then(() => true);
  if (path === "/api/admin/intelligence/content" && method === "GET") return adminIntelligenceController.content(request, response).then(() => true);
  return false;
};

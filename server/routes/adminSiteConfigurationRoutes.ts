import type { IncomingMessage, ServerResponse } from "node:http";
import { adminSiteConfigurationController } from "../controllers/adminSiteConfigurationController";

export const handleAdminSiteConfigurationRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname;

  if (path === "/api/admin/site-settings" && method === "GET") return adminSiteConfigurationController.getSiteSettings(request, response).then(() => true);
  if (path === "/api/admin/site-settings" && method === "PATCH") return adminSiteConfigurationController.updateSiteSettings(request, response).then(() => true);
  if (path === "/api/admin/site-settings/draft" && method === "GET") return adminSiteConfigurationController.getSiteSettings(request, response).then(() => true);
  if (path === "/api/admin/site-settings/draft" && method === "POST") return adminSiteConfigurationController.getSiteSettings(request, response).then(() => true);
  if (path.startsWith("/api/admin/site-settings/draft/") && method === "PATCH") return adminSiteConfigurationController.updateSiteSettings(request, response).then(() => true);
  if (path.includes("/readiness") && path.startsWith("/api/admin/site-settings/draft/") && method === "GET") return adminSiteConfigurationController.siteReadiness(request, response).then(() => true);
  if (path.includes("/validate") && path.startsWith("/api/admin/site-settings/draft/") && (method === "GET" || method === "POST")) return adminSiteConfigurationController.siteReadiness(request, response).then(() => true);
  if (path.includes("/preview") && path.startsWith("/api/admin/site-settings/draft/") && method === "GET") return adminSiteConfigurationController.getSiteSettings(request, response).then(() => true);
  if ((path.includes("/publish") || path.includes("/republish")) && path.startsWith("/api/admin/site-settings/draft/") && method === "POST") return adminSiteConfigurationController.publishSiteSettings(request, response).then(() => true);
  if (path.includes("/archive") && path.startsWith("/api/admin/site-settings/draft/") && method === "POST") return adminSiteConfigurationController.archiveSiteSettings(request, response).then(() => true);
  if (path === "/api/admin/site-settings/versions" && method === "GET") return adminSiteConfigurationController.versions(request, response).then(() => true);
  const siteRollback = /^\/api\/admin\/site-settings\/versions\/([^/]+)\/(?:rollback|restore)$/.exec(path);
  if (siteRollback && method === "POST") return adminSiteConfigurationController.rollbackSiteSettings(request, response, decodeURIComponent(siteRollback[1])).then(() => true);

  if (path === "/api/admin/homepage" && method === "GET") return adminSiteConfigurationController.getHomepage(request, response).then(() => true);
  if (path === "/api/admin/homepage/draft" && method === "GET") return adminSiteConfigurationController.getHomepage(request, response).then(() => true);
  if (path === "/api/admin/homepage/draft" && method === "POST") return adminSiteConfigurationController.getHomepage(request, response).then(() => true);
  if (path.startsWith("/api/admin/homepage/draft/") && method === "PATCH") return adminSiteConfigurationController.updateHomepage(request, response).then(() => true);
  if (path.includes("/readiness") && path.startsWith("/api/admin/homepage/draft/") && method === "GET") return adminSiteConfigurationController.homepageReadiness(request, response).then(() => true);
  if (path.includes("/validate") && path.startsWith("/api/admin/homepage/draft/") && (method === "GET" || method === "POST")) return adminSiteConfigurationController.homepageReadiness(request, response).then(() => true);
  if (path.includes("/preview") && path.startsWith("/api/admin/homepage/draft/") && method === "GET") return adminSiteConfigurationController.getHomepage(request, response).then(() => true);
  if ((path.includes("/publish") || path.includes("/republish")) && path.startsWith("/api/admin/homepage/draft/") && method === "POST") return adminSiteConfigurationController.publishHomepage(request, response).then(() => true);
  if (path.includes("/archive") && path.startsWith("/api/admin/homepage/draft/") && method === "POST") return adminSiteConfigurationController.archiveSiteSettings(request, response).then(() => true);
  if (path === "/api/admin/homepage/versions" && method === "GET") return adminSiteConfigurationController.versions(request, response).then(() => true);
  const homepageRollback = /^\/api\/admin\/homepage\/versions\/([^/]+)\/(?:rollback|restore)$/.exec(path);
  if (homepageRollback && method === "POST") return adminSiteConfigurationController.rollbackSiteSettings(request, response, decodeURIComponent(homepageRollback[1])).then(() => true);

  return false;
};

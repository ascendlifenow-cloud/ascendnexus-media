import type { IncomingMessage, ServerResponse } from "node:http";
import { accessController } from "../controllers/accessController";

export const handleAccessRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "GET" && path === "/api/public/membership/tiers") return accessController.publicTiers(request, response).then(() => true);

  if (method === "GET" && path === "/api/member/access") return accessController.memberAccess(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/access/entitlements") return accessController.memberEntitlements(request, response).then(() => true);
  const memberContentMatch = /^\/api\/member\/access\/content\/([^/]+)\/([^/]+)$/.exec(path);
  if (method === "GET" && memberContentMatch) {
    return accessController.memberContentAccess(request, response, decodeURIComponent(memberContentMatch[1]), decodeURIComponent(memberContentMatch[2])).then(() => true);
  }

  const streamMatch = /^\/api\/member\/media\/([^/]+)\/stream-authorize$/.exec(path);
  if (method === "POST" && streamMatch) return accessController.authorizeStream(request, response, decodeURIComponent(streamMatch[1])).then(() => true);

  const downloadMatch = /^\/api\/member\/media\/([^/]+)\/download-authorize$/.exec(path);
  if (method === "POST" && downloadMatch) return accessController.authorizeDownload(request, response, decodeURIComponent(downloadMatch[1])).then(() => true);

  if (method === "GET" && (
    path === "/api/admin/membership-tiers" ||
    path === "/api/admin/membership-plans" ||
    path === "/api/admin/entitlements" ||
    path === "/api/admin/tier-entitlements" ||
    path === "/api/admin/member-access-grants" ||
    path === "/api/admin/access-policies" ||
    path === "/api/admin/access-overrides" ||
    path === "/api/admin/content-access"
  )) return accessController.adminCatalog(request, response).then(() => true);

  if (method === "GET" && path === "/api/admin/access-health") return accessController.adminHealth(request, response).then(() => true);
  const memberTierMatch = /^\/api\/admin\/members\/([^/]+)\/membership$/.exec(path);
  if (method === "POST" && memberTierMatch) return accessController.adminGrantTier(request, response, decodeURIComponent(memberTierMatch[1])).then(() => true);
  if (method === "POST" && path === "/api/admin/access-simulator") return accessController.adminSimulate(request, response).then(() => true);

  return false;
};

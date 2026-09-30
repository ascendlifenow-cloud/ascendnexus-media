import type { IncomingMessage, ServerResponse } from "node:http";
import { adminExportController } from "../controllers/admin/adminExportController";

export const handleAdminExportRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const exportJobMatch = /^\/api\/admin\/exports\/([^/]+)$/.exec(path);
  const cancelMatch = /^\/api\/admin\/exports\/([^/]+)\/cancel$/.exec(path);
  const downloadAuthorizeMatch = /^\/api\/admin\/exports\/([^/]+)\/download-authorize$/.exec(path);
  const verifyMatch = /^\/api\/admin\/exports\/([^/]+)\/verify$/.exec(path);
  const securityMatch = /^\/api\/admin\/exports\/([^/]+)\/security$/.exec(path);
  const downloadMatch = /^\/api\/admin\/exports\/download\/([^/]+)$/.exec(path);
  if (path === "/api/admin/exports/capabilities" && method === "GET") return adminExportController.capabilities(request, response).then(() => true);
  if (path === "/api/admin/exports/security-policy" && method === "GET") return adminExportController.securityPolicy(request, response).then(() => true);
  if (path === "/api/admin/export-import/certification" && method === "GET") return adminExportController.certificationStatus(request, response).then(() => true);
  if (path === "/api/admin/export-import/certification/run" && method === "POST") return adminExportController.runCertification(request, response).then(() => true);
  if (path === "/api/admin/exports/health" && method === "GET") return adminExportController.health(request, response).then(() => true);
  if (path === "/api/admin/exports/estimate" && method === "POST") return adminExportController.estimate(request, response).then(() => true);
  if (path === "/api/admin/exports" && method === "POST") return adminExportController.create(request, response).then(() => true);
  if (path === "/api/admin/exports" && method === "GET") return adminExportController.list(request, response).then(() => true);
  if (exportJobMatch && method === "GET") return adminExportController.get(request, response, exportJobMatch[1]).then(() => true);
  if (cancelMatch && method === "POST") return adminExportController.cancel(request, response, cancelMatch[1]).then(() => true);
  if (verifyMatch && method === "POST") return adminExportController.verify(request, response, verifyMatch[1]).then(() => true);
  if (securityMatch && method === "GET") return adminExportController.jobSecurity(request, response, securityMatch[1]).then(() => true);
  if (downloadAuthorizeMatch && method === "POST") return adminExportController.authorizeDownload(request, response, downloadAuthorizeMatch[1]).then(() => true);
  if (downloadMatch && method === "GET") return adminExportController.download(request, response, downloadMatch[1]).then(() => true);
  return false;
};

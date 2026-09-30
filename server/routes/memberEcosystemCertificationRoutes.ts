import type { IncomingMessage, ServerResponse } from "node:http";
import { adminMemberEcosystemCertificationController } from "../controllers/adminMemberEcosystemCertificationController";

export const handleMemberEcosystemCertificationRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method !== "GET") return false;

  if (path === "/api/admin/production-certification" || path === "/api/admin/launch-readiness" || path === "/api/admin/member-ecosystem-certification") return adminMemberEcosystemCertificationController.production(request, response, url).then(() => true);
  if (path === "/api/admin/member-certification") return adminMemberEcosystemCertificationController.member(request, response).then(() => true);
  if (path === "/api/admin/security-certification") return adminMemberEcosystemCertificationController.security(request, response).then(() => true);
  if (path === "/api/admin/performance-certification") return adminMemberEcosystemCertificationController.performance(request, response).then(() => true);
  if (path === "/api/admin/accessibility-certification") return adminMemberEcosystemCertificationController.accessibility(request, response).then(() => true);
  if (path === "/api/admin/deployment-certification") return adminMemberEcosystemCertificationController.deployment(request, response, url).then(() => true);
  return false;
};

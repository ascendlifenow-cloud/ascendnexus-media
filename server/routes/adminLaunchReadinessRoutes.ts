import type { IncomingMessage, ServerResponse } from "node:http";
import { adminLaunchReadinessController } from "../controllers/adminLaunchReadinessController";

export const handleAdminLaunchReadinessRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method === "GET" && (path === "/api/admin/launch-readiness" || path === "/api/admin/launch/blockers" || path === "/api/admin/launch/functional-readiness")) {
    await adminLaunchReadinessController.report(request, response);
    return true;
  }
  if (method === "GET" && (path === "/api/admin/launch-readiness/experience" || path === "/api/admin/launch/experience")) {
    await adminLaunchReadinessController.experience(request, response);
    return true;
  }
  if (method === "GET" && (path === "/api/admin/launch-readiness/admin-operations" || path === "/api/admin/launch/admin-operations")) {
    await adminLaunchReadinessController.adminOperations(request, response);
    return true;
  }
  if (method === "GET" && (
    path === "/api/admin/launch-readiness/infrastructure" ||
    path === "/api/admin/launch-readiness/infrastructure/report" ||
    path === "/api/admin/launch-readiness/infrastructure/migrations" ||
    path === "/api/admin/launch-readiness/infrastructure/backups" ||
    path === "/api/admin/launch-readiness/infrastructure/deployments" ||
    path === "/api/admin/launch/infrastructure"
  )) {
    await adminLaunchReadinessController.infrastructure(request, response);
    return true;
  }
  if (method === "POST" && path === "/api/admin/launch-readiness/infrastructure/verify") {
    await adminLaunchReadinessController.verifyInfrastructure(request, response);
    return true;
  }
  if (method === "GET" && (
    path === "/api/admin/launch-readiness/security-recovery" ||
    path === "/api/admin/launch-readiness/security-recovery/report" ||
    path === "/api/admin/launch/security-recovery"
  )) {
    await adminLaunchReadinessController.securityRecovery(request, response);
    return true;
  }
  if (method === "POST" && path === "/api/admin/launch-readiness/security-recovery/verify") {
    await adminLaunchReadinessController.verifySecurityRecovery(request, response);
    return true;
  }
  if (method === "GET" && (
    path === "/api/admin/launch-readiness/final-signoff" ||
    path === "/api/admin/launch-readiness/final-signoff/report" ||
    path === "/api/admin/launch/final-signoff"
  )) {
    await adminLaunchReadinessController.finalSignoff(request, response);
    return true;
  }
  if (method === "POST" && path === "/api/admin/launch-readiness/final-signoff/verify") {
    await adminLaunchReadinessController.verifyFinalSignoff(request, response);
    return true;
  }
  return false;
};

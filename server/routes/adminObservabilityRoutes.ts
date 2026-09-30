import type { IncomingMessage, ServerResponse } from "node:http";
import { adminObservabilityController } from "../controllers/adminObservabilityController";

export const handleAdminObservabilityRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/api/admin/observability/overview" && method === "GET") return adminObservabilityController.overview(request, response).then(() => true);
  if (path === "/api/admin/observability/services" && method === "GET") return adminObservabilityController.health(request, response).then(() => true);
  if (path === "/api/admin/observability/metrics" && method === "GET") return adminObservabilityController.metrics(request, response).then(() => true);
  if (path === "/api/admin/observability/errors" && method === "GET") return adminObservabilityController.errors(request, response).then(() => true);
  if (path === "/api/admin/observability/traces" && method === "GET") return adminObservabilityController.traces(request, response).then(() => true);
  if (path === "/api/admin/observability/synthetics" && (method === "GET" || method === "POST")) return adminObservabilityController.synthetics(request, response).then(() => true);
  if (path === "/api/admin/observability/slos" && method === "GET") return adminObservabilityController.slos(request, response).then(() => true);
  if (path === "/api/admin/observability/error-budgets" && method === "GET") return adminObservabilityController.errorBudgets(request, response).then(() => true);
  if (path === "/api/admin/observability/certification" && method === "GET") return adminObservabilityController.certification(request, response, url).then(() => true);
  if (path === "/api/admin/observability/checks/run" && method === "POST") return adminObservabilityController.health(request, response).then(() => true);
  if (path === "/api/admin/observability/synthetics/run" && method === "POST") return adminObservabilityController.synthetics(request, response).then(() => true);
  if (path === "/api/admin/reliability/health" && method === "GET") return adminObservabilityController.reliability(request, response).then(() => true);
  if (path === "/api/admin/reliability/slo-report" && method === "GET") return adminObservabilityController.slos(request, response).then(() => true);
  if (path === "/api/admin/reliability/error-budget" && method === "GET") return adminObservabilityController.errorBudgets(request, response).then(() => true);
  if (path === "/api/admin/reliability/consistency" && method === "GET") return adminObservabilityController.consistency(request, response).then(() => true);
  if (path === "/api/admin/reliability/storage-reconcile" && method === "GET") return adminObservabilityController.storageReconcile(request, response).then(() => true);
  if (path === "/api/admin/reliability/queue-reconcile" && method === "GET") return adminObservabilityController.queueReconcile(request, response).then(() => true);
  if (path === "/api/admin/certification/matrix" && method === "GET") return adminObservabilityController.matrix(request, response).then(() => true);
  if (path === "/api/admin/certification/launch" && method === "GET") return adminObservabilityController.certification(request, response, url).then(() => true);
  return false;
};

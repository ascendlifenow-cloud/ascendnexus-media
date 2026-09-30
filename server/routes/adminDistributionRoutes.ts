import type { IncomingMessage, ServerResponse } from "node:http";
import { adminDistributionController } from "../controllers/adminDistributionController";

export const handleAdminDistributionRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const runJob = path.match(/^\/api\/admin\/distribution\/jobs\/([^/]+)\/run$/);
  if (path === "/api/admin/distribution/overview" && method === "GET") return adminDistributionController.dashboard(request, response).then(() => true);
  if (path === "/api/admin/distribution/jobs" && (method === "GET" || method === "POST")) return adminDistributionController.jobs(request, response).then(() => true);
  if (runJob && method === "POST") return adminDistributionController.runJob(request, response, runJob[1]).then(() => true);
  if (path === "/api/admin/distribution/retry" && method === "POST") return adminDistributionController.retry(request, response).then(() => true);
  if (path === "/api/admin/distribution/connectors" && method === "GET") return adminDistributionController.connectors(request, response).then(() => true);
  if (path === "/api/admin/distribution/queues" && method === "GET") return adminDistributionController.queues(request, response).then(() => true);
  if (path === "/api/admin/distribution/analytics" && (method === "GET" || method === "POST")) return adminDistributionController.analytics(request, response).then(() => true);
  if (path === "/api/admin/distribution/history" && method === "GET") return adminDistributionController.history(request, response).then(() => true);
  return false;
};

import type { IncomingMessage, ServerResponse } from "node:http";
import { adminOperationsController } from "../controllers/adminOperationsController";

export const handleAdminOperationsRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const workflowTransition = path.match(/^\/api\/admin\/operations\/workflows\/([^/]+)\/transition$/);
  const workflowRun = path.match(/^\/api\/admin\/operations\/workflows\/([^/]+)\/run$/);
  if (path === "/api/admin/operations/overview" && method === "GET") return adminOperationsController.overview(request, response).then(() => true);
  if (path === "/api/admin/operations/workflows" && (method === "GET" || method === "POST")) return adminOperationsController.workflows(request, response).then(() => true);
  if (workflowTransition && method === "POST") return adminOperationsController.transitionWorkflow(request, response, workflowTransition[1]).then(() => true);
  if (workflowRun && method === "POST") return adminOperationsController.runWorkflow(request, response, workflowRun[1]).then(() => true);
  if (path === "/api/admin/operations/calendar" && (method === "GET" || method === "POST")) return adminOperationsController.calendar(request, response, url).then(() => true);
  if (path === "/api/admin/operations/campaigns" && (method === "GET" || method === "POST")) return adminOperationsController.campaigns(request, response).then(() => true);
  if (path === "/api/admin/operations/verification" && (method === "GET" || method === "POST")) return adminOperationsController.verification(request, response).then(() => true);
  if (path === "/api/admin/operations/content-health" && method === "GET") return adminOperationsController.contentHealth(request, response).then(() => true);
  if (path === "/api/admin/operations/recommendations" && (method === "GET" || method === "POST")) return adminOperationsController.recommendations(request, response).then(() => true);
  if (path === "/api/admin/operations/lifecycle" && method === "GET") return adminOperationsController.lifecycle(request, response).then(() => true);
  if (path === "/api/admin/operations/growth" && method === "GET") return adminOperationsController.growth(request, response).then(() => true);
  if (path === "/api/admin/operations/reports" && (method === "GET" || method === "POST")) return adminOperationsController.reports(request, response).then(() => true);
  return false;
};

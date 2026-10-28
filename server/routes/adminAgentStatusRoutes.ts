import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { agentStatusService } from "../services/agents/AgentStatusService";
import { sendJson } from "../middleware/mediaErrorMiddleware";

export async function handleAdminAgentStatusRoute(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
  if (!url.pathname.startsWith("/api/admin/agents/")) return false;
  const auth = await mediaAuthorizationService.authenticate(request);
  mediaAuthorizationService.requirePermission(auth, "operations.read");
  const logs = /^\/api\/admin\/agents\/runs\/([^/]+)\/logs$/.exec(url.pathname);
  if (request.method !== "GET" || url.pathname !== "/api/admin/agents/runs" && !logs) {
    sendJson(response, 405, { success: false, errors: ["Agent reporting is restricted to trusted internal producers."] }, { Allow: "GET", "Cache-Control": "private, no-store" });
    return true;
  }
  const data = logs ? await agentStatusService.logs(logs[1], url.searchParams) : await agentStatusService.runs(url.searchParams);
  sendJson(response, 200, { success: true, data }, { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" });
  return true;
}

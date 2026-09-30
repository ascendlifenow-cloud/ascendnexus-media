import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { distributionEngineService } from "../services/distribution/DistributionEngineService";
import { platformConnectorRegistry } from "../services/distribution/PlatformConnectorRegistry";
import { distributionQueueService } from "../services/distribution/DistributionQueueService";
import { platformAnalyticsCollector } from "../services/distribution/PlatformAnalyticsCollector";
import { distributionAuditService } from "../services/distribution/DistributionAuditService";

const actorId = (auth: { user?: { userId?: string } }) => auth.user?.userId ?? "admin";

export class AdminDistributionController {
  async dashboard(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "distribution.read");
    sendJson(response, 200, { success: true, data: await distributionEngineService.dashboard() });
  }

  async jobs(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "distribution.manage" : "distribution.read");
    const data = request.method === "POST"
      ? await distributionEngineService.createJob(await parseJsonBody(request), actorId(auth))
      : await distributionEngineService.listJobs();
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }

  async runJob(request: IncomingMessage, response: ServerResponse, distributionJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "distribution.run");
    sendJson(response, 200, { success: true, data: await distributionEngineService.runJob(distributionJobId, actorId(auth)) });
  }

  async retry(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "distribution.run");
    sendJson(response, 200, { success: true, data: await distributionEngineService.retryFailures() });
  }

  async connectors(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "platforms.read");
    sendJson(response, 200, { success: true, data: await platformConnectorRegistry.health() });
  }

  async queues(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "distribution.read");
    sendJson(response, 200, { success: true, data: await distributionQueueService.getQueueStatus() });
  }

  async analytics(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "distribution.read");
    const data = request.method === "POST" ? await platformAnalyticsCollector.collect() : await platformAnalyticsCollector.list();
    sendJson(response, 200, { success: true, data });
  }

  async history(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "distribution.read");
    sendJson(response, 200, { success: true, data: await distributionAuditService.list() });
  }
}

export const adminDistributionController = new AdminDistributionController();

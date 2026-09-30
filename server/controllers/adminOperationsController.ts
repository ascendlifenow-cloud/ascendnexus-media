import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { operationsDashboardService } from "../services/operations/OperationsDashboardService";
import { releaseWorkflowService } from "../services/operations/ReleaseWorkflowService";
import { publishingCalendarService } from "../services/operations/PublishingCalendarService";
import { releaseVerificationService } from "../services/operations/ReleaseVerificationService";
import { campaignAutomationService } from "../services/operations/CampaignAutomationService";
import { optimizationRecommendationService } from "../services/operations/OptimizationRecommendationService";
import { contentHealthService } from "../services/operations/ContentHealthService";
import { contentLifecycleService } from "../services/operations/ContentLifecycleService";
import { operationalReportingService } from "../services/operations/OperationalReportingService";
import { publishingAutomationService } from "../services/operations/PublishingAutomationService";
import { artistGrowthService } from "../services/operations/ArtistGrowthService";
import type { ReleaseWorkflowStatus } from "../models/operations/OperationsModels";

const actorId = (auth: { user?: { userId?: string } }) => auth.user?.userId ?? "admin";

export class AdminOperationsController {
  async overview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "operations.read");
    sendJson(response, 200, { success: true, data: await operationsDashboardService.buildOverview() });
  }

  async workflows(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "release.workflow.manage" : "operations.read");
    const data = request.method === "POST" ? await releaseWorkflowService.createWorkflow(await parseJsonBody(request), actorId(auth)) : await releaseWorkflowService.listWorkflows();
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }

  async transitionWorkflow(request: IncomingMessage, response: ServerResponse, workflowId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "release.workflow.manage");
    const body = await parseJsonBody(request) as { status?: ReleaseWorkflowStatus; note?: string };
    if (!body.status) throw new Error("Workflow status is required.");
    sendJson(response, 200, { success: true, data: await releaseWorkflowService.transitionWorkflow(workflowId, body.status, actorId(auth), body.note) });
  }

  async runWorkflow(request: IncomingMessage, response: ServerResponse, workflowId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "release.workflow.manage");
    sendJson(response, 200, { success: true, data: await publishingAutomationService.runWorkflow(workflowId, actorId(auth)) });
  }

  async calendar(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "operations.manage" : "operations.read");
    const data = request.method === "POST" ? await publishingCalendarService.createEvent(await parseJsonBody(request), actorId(auth)) : await publishingCalendarService.listEvents(url.searchParams);
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }

  async campaigns(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "campaigns.manage" : "operations.read");
    const data = request.method === "POST" ? await campaignAutomationService.scheduleCampaign(await parseJsonBody(request), actorId(auth)) : await campaignAutomationService.listCampaigns();
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }

  async verification(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "operations.manage" : "operations.read");
    const data = request.method === "POST" ? await releaseVerificationService.verify(await parseJsonBody(request), actorId(auth)) : await releaseVerificationService.listVerifications();
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }

  async contentHealth(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "operations.read");
    sendJson(response, 200, { success: true, data: await contentHealthService.buildHealth() });
  }

  async recommendations(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "optimization.read");
    const data = request.method === "POST" ? await optimizationRecommendationService.generateRecommendations() : await optimizationRecommendationService.listRecommendations();
    sendJson(response, 200, { success: true, data });
  }

  async lifecycle(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "operations.read");
    sendJson(response, 200, { success: true, data: { reconciliation: await contentLifecycleService.reconcileLifecycle(), records: await contentLifecycleService.listLifecycle() } });
  }

  async growth(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "operations.read");
    sendJson(response, 200, { success: true, data: await artistGrowthService.buildRoadmap() });
  }

  async reports(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "operations.manage" : "reports.read");
    const data = request.method === "POST" ? await operationalReportingService.generateReport(await parseJsonBody(request).catch(() => ({})), actorId(auth)) : await operationalReportingService.listReports();
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }
}

export const adminOperationsController = new AdminOperationsController();

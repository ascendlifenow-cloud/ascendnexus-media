import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { productionHealthCheckRegistry } from "../services/observability/ProductionHealthCheckRegistry";
import { productionMetricsService } from "../services/observability/ProductionMetricsService";
import { productionErrorMonitoringService } from "../services/observability/ProductionErrorMonitoringService";
import { productionTracingService } from "../services/observability/ProductionTracingService";
import { syntheticMonitoringService } from "../services/observability/SyntheticMonitoringService";
import { errorBudgetService } from "../services/reliability/ErrorBudgetService";
import { serviceLevelObjectiveService } from "../services/reliability/ServiceLevelObjectiveService";
import { reliabilityReleaseGateService } from "../services/reliability/ReliabilityReleaseGateService";
import { productionConsistencyVerificationService } from "../services/reliability/ProductionConsistencyVerificationService";
import { storageReconciliationService } from "../services/reliability/StorageReconciliationService";
import { queueReconciliationService } from "../services/reliability/QueueReconciliationService";
import { productionLaunchCertificationService } from "../services/certification/ProductionLaunchCertificationService";
import { promptCompletionMatrixService } from "../services/certification/PromptCompletionMatrixService";

export class AdminObservabilityController {
  async overview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "observability.read");
    const [health, metrics, errors, tracing, synthetics, reliability] = await Promise.all([
      productionHealthCheckRegistry.runAllChecks(),
      Promise.resolve(productionMetricsService.getHealth()),
      Promise.resolve(productionErrorMonitoringService.getHealth()),
      Promise.resolve(productionTracingService.getHealth()),
      syntheticMonitoringService.getHealth(),
      reliabilityReleaseGateService.evaluate(),
    ]);
    sendJson(response, 200, { success: true, data: { health, metrics, errors, tracing, synthetics, reliability } });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "observability.read");
    sendJson(response, 200, { success: true, data: await productionHealthCheckRegistry.runAllChecks() });
  }

  async metrics(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "observability.read");
    sendJson(response, 200, { success: true, data: { health: productionMetricsService.getHealth(), recentSamples: productionMetricsService.getRecentSamples() } });
  }

  async errors(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "observability.read");
    sendJson(response, 200, { success: true, data: productionErrorMonitoringService.getHealth() });
  }

  async traces(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "observability.read");
    sendJson(response, 200, { success: true, data: productionTracingService.getHealth() });
  }

  async synthetics(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "observability.run" : "observability.read");
    const data = request.method === "POST" ? await syntheticMonitoringService.runSuite() : await syntheticMonitoringService.getHealth();
    sendJson(response, 200, { success: true, data });
  }

  async slos(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "reliability.read");
    sendJson(response, 200, { success: true, data: await serviceLevelObjectiveService.ensureDefaults() });
  }

  async errorBudgets(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "reliability.read");
    sendJson(response, 200, { success: true, data: await errorBudgetService.buildErrorBudgetReport() });
  }

  async reliability(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "reliability.read");
    sendJson(response, 200, { success: true, data: await reliabilityReleaseGateService.evaluate() });
  }

  async consistency(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "reliability.read");
    sendJson(response, 200, { success: true, data: await productionConsistencyVerificationService.buildConsistencyReport() });
  }

  async storageReconcile(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "reliability.read");
    sendJson(response, 200, { success: true, data: await storageReconciliationService.reconcile() });
  }

  async queueReconcile(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "reliability.read");
    sendJson(response, 200, { success: true, data: await queueReconciliationService.reconcile() });
  }

  async certification(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch.certification.read");
    sendJson(response, 200, { success: true, data: await productionLaunchCertificationService.buildCertificationDecision(url.searchParams.get("environment") ?? "production") });
  }

  async matrix(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch.certification.read");
    sendJson(response, 200, { success: true, data: promptCompletionMatrixService.buildMatrix() });
  }
}

export const adminObservabilityController = new AdminObservabilityController();

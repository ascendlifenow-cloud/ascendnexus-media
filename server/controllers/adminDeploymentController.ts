import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { deploymentHealthService } from "../services/deployment/DeploymentHealthService";
import { deploymentLaunchChecklistService } from "../services/deployment/DeploymentLaunchChecklistService";
import { productionLaunchGateService } from "../services/deployment/ProductionLaunchGateService";
import { deploymentReleaseService } from "../services/deployment/DeploymentReleaseService";
import { deploymentRollbackService } from "../services/deployment/DeploymentRollbackService";
import { maintenanceModeService } from "../services/deployment/MaintenanceModeService";

const actorId = (auth: Awaited<ReturnType<typeof mediaAuthorizationService.authenticate>>) => auth.adminId ?? auth.userId ?? "system";

export class AdminDeploymentController {
  async overview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.read");
    const [health, currentRelease, previousRelease, launchGate] = await Promise.all([
      deploymentHealthService.getHealth(),
      deploymentReleaseService.getCurrentRelease(),
      deploymentReleaseService.getPreviousVerifiedRelease(),
      productionLaunchGateService.evaluate(),
    ]);
    sendJson(response, 200, { success: true, data: { health, currentRelease, previousRelease, launchGate, maintenance: maintenanceModeService.getStatus() } });
  }

  async releases(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.read");
    sendJson(response, 200, { success: true, data: { releases: await deploymentReleaseService.listReleases() } });
  }

  async current(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.read");
    sendJson(response, 200, { success: true, data: await deploymentReleaseService.getCurrentRelease() });
  }

  async previous(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.read");
    sendJson(response, 200, { success: true, data: await deploymentReleaseService.getPreviousVerifiedRelease() });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "system.health.read");
    sendJson(response, 200, { success: true, data: await deploymentHealthService.getHealth() });
  }

  async verify(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.verify");
    sendJson(response, 200, { success: true, data: await deploymentLaunchChecklistService.buildLaunchReport() });
  }

  async launchGate(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.approve");
    sendJson(response, 200, { success: true, data: await productionLaunchGateService.evaluate() });
  }

  async rollback(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.rollback");
    const body = await parseJsonBody(request).catch(() => ({})) as Record<string, unknown>;
    const releaseId = typeof body.releaseId === "string" ? body.releaseId : "";
    const reason = typeof body.reason === "string" ? body.reason : "manual rollback requested";
    sendJson(response, 202, { success: true, data: await deploymentRollbackService.requestRollback(releaseId, actorId(auth), reason) });
  }

  async backupStatus(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "deployment.read");
    sendJson(response, 200, {
      success: true,
      data: {
        databaseBackupVerified: process.env.DEPLOYMENT_BACKUP_VERIFIED === "true",
        restoreVerified: process.env.DEPLOYMENT_RESTORE_VERIFIED === "true",
        checkedAt: new Date().toISOString(),
      },
    });
  }
}

export const adminDeploymentController = new AdminDeploymentController();

import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaIntakeFolderWatcherService } from "../services/mediaIntake/MediaIntakeFolderWatcherService";
import { mediaIntakeRecordRepository } from "../services/mediaIntake/MediaIntakeRecordRepository";
import { mediaIntakeConfigService } from "../services/mediaIntake/MediaIntakeConfigService";
import { reprocessPendingIntake } from "../services/mediaIntake/MediaIntakeAutoAssignmentService";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";

export class AdminMediaIntakeController {
  async autoAssign(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    mediaAuthorizationService.requirePermission(auth, "artists.update");
    mediaAuthorizationService.requirePermission(auth, "releases.update");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const result = await reprocessPendingIntake(body.dryRun !== false);
    if (!result.dryRun) await mediaAuditPersistenceService.record("media_intake_cleanup_completed", "Re-evaluated pending media intake assignments.", { actorId: auth.adminId, metadata: { assigned: result.assigned, reconciled: result.reconciled, assessed: result.assessed, threshold: result.threshold } });
    sendJson(response, 200, result);
  }
  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, health: await mediaIntakeFolderWatcherService.getHealth() });
  }

  async status(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, status: mediaIntakeFolderWatcherService.getWatchStatus(), config: mediaIntakeConfigService.getConfig() });
  }

  async records(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const status = url.searchParams.get("status") || undefined;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
    sendJson(response, 200, { success: true, intakeRecords: await mediaIntakeRecordRepository.list({ status: status as never, limit }) });
  }

  async scan(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    sendJson(response, 202, await mediaIntakeFolderWatcherService.scanNow());
  }

  async start(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    mediaIntakeFolderWatcherService.start();
    sendJson(response, 202, { success: true, status: mediaIntakeFolderWatcherService.getWatchStatus() });
  }

  async stop(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    mediaIntakeFolderWatcherService.stop();
    sendJson(response, 200, { success: true, status: mediaIntakeFolderWatcherService.getWatchStatus() });
  }
}

export const adminMediaIntakeController = new AdminMediaIntakeController();

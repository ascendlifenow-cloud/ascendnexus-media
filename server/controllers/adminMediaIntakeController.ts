import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaIntakeFolderWatcherService } from "../services/mediaIntake/MediaIntakeFolderWatcherService";
import { mediaIntakeRecordRepository } from "../services/mediaIntake/MediaIntakeRecordRepository";
import { mediaIntakeConfigService } from "../services/mediaIntake/MediaIntakeConfigService";

export class AdminMediaIntakeController {
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

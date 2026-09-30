import type { IncomingMessage, ServerResponse } from "node:http";
import { databaseHealthService } from "../database/DatabaseHealthService";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";

export class AdminDatabaseController {
  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "system.health.read");
    sendJson(response, 200, { success: true, data: await databaseHealthService.getHealth() });
  }
}

export const adminDatabaseController = new AdminDatabaseController();

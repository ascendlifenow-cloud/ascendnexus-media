import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { configurationHealthService } from "../config/configHealth";
import { getConfigurationValidationResult } from "../config/configValidation";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";

export class AdminSystemConfigurationController {
  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "system.configuration.read");
    sendJson(response, 200, {
      success: true,
      data: configurationHealthService.getConfigurationHealth(),
    });
  }

  async validation(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "system.configuration.read");
    sendJson(response, 200, {
      success: true,
      data: getConfigurationValidationResult(),
    });
  }
}

export const adminSystemConfigurationController = new AdminSystemConfigurationController();

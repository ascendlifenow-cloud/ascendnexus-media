import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../../services/media/MediaAuthorizationService";
import { productionSecurityHealthService } from "../../services/security/ProductionSecurityHealthService";
import { securityLaunchGateService } from "../../services/security/SecurityLaunchGateService";

export class AdminSecurityController {
  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "security.read");
    sendJson(response, 200, { success: true, data: await productionSecurityHealthService.getHealthReport() });
  }

  async overview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "security.read");
    const health = await productionSecurityHealthService.getHealthReport();
    sendJson(response, 200, { success: true, data: { ...health, launchDecision: await securityLaunchGateService.evaluate() } });
  }

  async launchDecision(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "security.launch.review");
    sendJson(response, 200, { success: true, data: await securityLaunchGateService.evaluate() });
  }
}

export const adminSecurityController = new AdminSecurityController();

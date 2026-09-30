import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../mediaErrorMiddleware";
import { maintenanceModeService } from "../../services/deployment/MaintenanceModeService";

export const handleMaintenanceMode = (request: IncomingMessage, response: ServerResponse) => {
  if (!maintenanceModeService.isEnabled()) return false;
  const path = request.url ?? "/";
  if (path.startsWith("/api/admin") || path.startsWith("/api/health") || path.startsWith("/health")) return false;
  const status = maintenanceModeService.getStatus();
  response.setHeader("Retry-After", String(status.retryAfterSeconds));
  sendJson(response, 503, {
    success: false,
    code: "MAINTENANCE_MODE",
    message: "Ascend Nexus Media is temporarily unavailable for maintenance.",
  });
  return true;
};

export class MaintenanceModeService {
  isEnabled() {
    return ["1", "true", "enabled"].includes(String(process.env.MAINTENANCE_MODE ?? "").toLowerCase());
  }

  getStatus() {
    return {
      enabled: this.isEnabled(),
      reason: process.env.MAINTENANCE_MODE_REASON || "maintenance",
      retryAfterSeconds: Number(process.env.MAINTENANCE_RETRY_AFTER_SECONDS || 300),
    };
  }
}

export const maintenanceModeService = new MaintenanceModeService();

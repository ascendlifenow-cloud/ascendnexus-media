import { productionSecurityHealthService } from "./ProductionSecurityHealthService";

export class SecurityLaunchGateService {
  async evaluate() {
    const health = await productionSecurityHealthService.getHealthReport();
    const blocking = health.controlStatuses.filter((control) => control.status === "fail");
    const warnings = health.controlStatuses.filter((control) => control.status === "warn");
    return {
      decision: blocking.length ? "blocked" : warnings.length ? "approved_with_exceptions" : "approved",
      blockingFindings: blocking,
      acceptedRisks: warnings.map((warning) => ({
        findingId: `SECURITY-WARN-${warning.control.toUpperCase()}`,
        reason: warning.message,
        expiresAt: null,
        status: "pending_staging_review",
      })),
      checkedAt: new Date().toISOString(),
    };
  }
}

export const securityLaunchGateService = new SecurityLaunchGateService();

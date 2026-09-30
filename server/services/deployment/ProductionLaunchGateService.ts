import { deploymentLaunchChecklistService } from "./DeploymentLaunchChecklistService";

export class ProductionLaunchGateService {
  async evaluate(environment?: string) {
    const report = await deploymentLaunchChecklistService.buildLaunchReport(environment);
    return {
      decision: report.ready ? (report.warnings.length ? "approved_with_warnings" : "approved") : "blocked",
      ...report,
    };
  }
}

export const productionLaunchGateService = new ProductionLaunchGateService();

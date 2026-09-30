import type { ServiceLevelObjectiveRecord } from "../../models/observability/ObservabilityModels";
import { serviceLevelObjectiveService } from "./ServiceLevelObjectiveService";

export class ErrorBudgetService {
  calculateBudget(slo: ServiceLevelObjectiveRecord) { return Math.max(0, 1 - slo.target); }
  calculateConsumedBudget(_slo: ServiceLevelObjectiveRecord) { return 0; }
  calculateBurnRate(slo: ServiceLevelObjectiveRecord) { const budget = this.calculateBudget(slo); return budget ? this.calculateConsumedBudget(slo) / budget : 0; }
  getRemainingBudget(slo: ServiceLevelObjectiveRecord) { return Math.max(0, this.calculateBudget(slo) - this.calculateConsumedBudget(slo)); }
  getBudgetStatus(slo: ServiceLevelObjectiveRecord) {
    const burn = this.calculateBurnRate(slo);
    return burn >= 1 ? "exhausted" : burn >= 0.8 ? "critical" : burn >= 0.5 ? "warning" : "healthy";
  }
  async buildErrorBudgetReport() {
    const slos = await serviceLevelObjectiveService.ensureDefaults();
    return { status: "insufficient_data", slos: slos.map((slo) => ({ sloId: slo.sloId, name: slo.name, budget: this.calculateBudget(slo), consumed: this.calculateConsumedBudget(slo), remaining: this.getRemainingBudget(slo), burnRate: this.calculateBurnRate(slo), status: "insufficient_data" })), checkedAt: new Date().toISOString() };
  }
}

export const errorBudgetService = new ErrorBudgetService();

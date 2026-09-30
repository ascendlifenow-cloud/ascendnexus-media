import { mediaWorkerHealthService } from "../media/MediaWorkerHealthService";

export class QueueReconciliationService {
  async reconcile() {
    const health = await mediaWorkerHealthService.getFullHealthReport();
    const errors = [...health.errors];
    const warnings = [...health.warnings];
    return { status: errors.length ? "failed" : warnings.length ? "warnings" : "healthy", errors, warnings, queueCounts: health.queueCounts, checkedAt: new Date().toISOString() };
  }
}

export const queueReconciliationService = new QueueReconciliationService();

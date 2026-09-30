import { productionStorageHealthService } from "../media/ProductionStorageHealthService";

export class StorageReconciliationService {
  async reconcile() {
    const health = await productionStorageHealthService.getFullHealthReport();
    return { status: health.status === "critical" ? "failed" : health.status, errors: health.errors, warnings: health.warnings, checkedAt: new Date().toISOString() };
  }
}

export const storageReconciliationService = new StorageReconciliationService();

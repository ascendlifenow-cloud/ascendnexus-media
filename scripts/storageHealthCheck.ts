import { productionStorageHealthService } from "../server/services/media/ProductionStorageHealthService";

const report = await productionStorageHealthService.getFullHealthReport();
console.log(JSON.stringify({ success: report.errors.length === 0, report }, null, 2));
if (report.errors.length) process.exitCode = 1;

import { mediaStorageReconciliationService } from "../server/services/media/MediaStorageReconciliationService";

const report = await mediaStorageReconciliationService.buildReconciliationReport();
console.log(JSON.stringify({ success: report.status === "healthy", report }, null, 2));
if (report.status === "failed" || report.status === "critical") process.exitCode = 1;

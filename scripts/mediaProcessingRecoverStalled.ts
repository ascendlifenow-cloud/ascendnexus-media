import { mediaProcessingRecoveryService } from "../server/services/media/MediaProcessingRecoveryService";

const report = await mediaProcessingRecoveryService.buildRecoveryReport();
console.log(JSON.stringify({ success: report.status !== "failed", report }, null, 2));

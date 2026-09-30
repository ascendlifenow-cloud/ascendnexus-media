import { mediaWorkerHealthService } from "../server/services/media/MediaWorkerHealthService";

const health = await mediaWorkerHealthService.getFullHealthReport();
console.log(JSON.stringify({ success: health.errors.length === 0, health }, null, 2));
if (health.errors.length) process.exitCode = 1;

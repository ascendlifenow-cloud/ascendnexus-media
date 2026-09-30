import { mediaCdnService } from "../server/services/media/MediaCdnService";

const health = await mediaCdnService.getHealthStatus();
console.log(JSON.stringify({ success: !health.enabled || health.baseUrlConfigured, health }, null, 2));
if (health.enabled && !health.baseUrlConfigured) process.exitCode = 1;

import { mediaProcessingRetryService } from "../server/services/media/MediaProcessingRetryService";

const retried = await mediaProcessingRetryService.retryFailedJobs();
console.log(JSON.stringify({
  success: true,
  retried: retried.filter(Boolean).length,
}, null, 2));

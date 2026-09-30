import { mediaQueueRegistry } from "../server/queues/MediaQueueRegistry";

console.log(JSON.stringify({
  success: true,
  runtime: mediaQueueRegistry.getRuntimeMode(),
  queues: mediaQueueRegistry.getQueueHealth(),
}, null, 2));

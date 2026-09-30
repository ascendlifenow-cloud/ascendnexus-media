import { mediaProcessingJobService } from "../services/media/MediaProcessingJobService";
import { ImageProcessingWorker } from "./ImageProcessingWorker";
import { AudioProcessingWorker } from "./AudioProcessingWorker";
import { MediaStorageOperationsWorker } from "./MediaStorageOperationsWorker";
import { MediaCdnOperationsWorker } from "./MediaCdnOperationsWorker";
import { MediaPublicationWorker } from "./MediaPublicationWorker";
import { mediaPublicationOrchestrationService } from "../services/publication/MediaPublicationOrchestrationService";

const workers = {
  image: new ImageProcessingWorker(),
  audio: new AudioProcessingWorker(),
  storage: new MediaStorageOperationsWorker(),
  cdn: new MediaCdnOperationsWorker(),
  publication: new MediaPublicationWorker(),
};

const selected = process.argv[2] ?? "all";
const selectedWorkers = selected === "all" ? Object.values(workers) : [workers[selected as keyof typeof workers]].filter(Boolean);

for (const worker of selectedWorkers) worker.start();

const jobs = await mediaProcessingJobService.listJobs({ status: "queued" });
for (const job of jobs) {
  const worker = selectedWorkers.find((item) => item.queueName === job.queueName);
  if (worker && "processJob" in worker) await worker.processJob(job);
}

const publicationWorker = selectedWorkers.find((worker) => worker instanceof MediaPublicationWorker) as MediaPublicationWorker | undefined;
let processedPublicationOperations = 0;
if (publicationWorker) {
  const operations = await mediaPublicationOrchestrationService.listPublicationOperations({ status: "requested" });
  for (const operation of operations) {
    await publicationWorker.processOperation(operation.publicationOperationId);
    processedPublicationOperations += 1;
  }
}

console.log(JSON.stringify({
  success: true,
  selected,
  processedJobs: jobs.length,
  processedPublicationOperations,
  workerHealth: selectedWorkers.map((worker) => ({ workerName: worker.workerName, ...worker.getHealth() })),
}, null, 2));

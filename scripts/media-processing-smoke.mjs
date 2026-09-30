import { mediaProcessingJobService } from "../server/services/media/MediaProcessingJobService.ts";
import { mediaStoragePersistenceService } from "../server/services/media/MediaStoragePersistenceService.ts";
import { mediaAssetPersistenceService } from "../server/services/media/MediaAssetPersistenceService.ts";
import { mediaProcessingEnqueueService } from "../server/services/media/MediaProcessingEnqueueService.ts";
import { MediaStorageOperationsWorker } from "../server/workers/MediaStorageOperationsWorker.ts";
import { ImageProcessingWorker } from "../server/workers/ImageProcessingWorker.ts";
import { LocalStorageAdapter } from "../server/storage/adapters/LocalStorageAdapter.ts";

const now = new Date().toISOString();
const storageObject = await mediaStoragePersistenceService.create({
  storageObjectId: `storage-processing-smoke-${Date.now()}`,
  provider: "local",
  bucket: "smoke",
  storagePath: "private/smoke/missing-file.png",
  fileName: "missing-file.png",
  originalFileName: "missing-file.png",
  mimeType: "image/png",
  fileExtension: "png",
  fileSizeBytes: 10,
  mediaCategory: "image",
  assetType: "cover_art",
  accessLevel: "admin_only",
  status: "ready",
  uploadedAt: now,
  updatedAt: now,
});
const mediaAsset = await mediaAssetPersistenceService.create({
  assetId: `asset-processing-smoke-${Date.now()}`,
  ownerType: "media_library",
  ownerId: "unassigned",
  assetType: "cover_art",
  title: "Processing Smoke",
  url: storageObject.storagePath,
  status: "draft",
  assignmentStatus: "unassigned",
  createdAt: now,
  updatedAt: now,
});
const processing = await mediaProcessingEnqueueService.enqueuePostUploadJobs({ mediaAsset, storageObject, uploadJobId: "upload-smoke", actorId: "smoke" });
const checksumJob = (await mediaProcessingJobService.getJobsForAsset(mediaAsset.assetId)).find((job) => job.jobType === "checksum_verify");
if (!checksumJob) throw new Error("Checksum job was not queued.");
const worker = new MediaStorageOperationsWorker();
const processed = await worker.processJob(checksumJob);
const summary = await mediaProcessingJobService.buildAssetProcessingSummary(mediaAsset.assetId);
if (!processed || !["failed", "retrying", "dead_letter"].includes(processed.status)) throw new Error("Missing source should fail or retry checksum verification.");

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXUlEQVR4nO3PQQ0AIBDAMMC/5+ONAvZoFSzZnplM5wH8xQjsEdiPAB3COAR2COxHgA5hHAI7BPYjQIcwDoEdAvsRoEMYh8AOgf0I0CGMQ2CHwH4E6BDGIbBDYD8CZgK7HfS2JQAAAABJRU5ErkJggg==",
  "base64",
);
const adapter = new LocalStorageAdapter();
const realStorageObject = await adapter.upload({
  file: {
    fieldName: "file",
    fileName: "processing-smoke.png",
    mimeType: "image/png",
    size: pngBuffer.length,
    buffer: pngBuffer,
  },
  storagePath: `private/smoke/processing-smoke-${Date.now()}.png`,
  target: {
    targetType: "media_library",
    ownerType: "media_library",
    assetType: "cover_art",
    intendedUse: "processing_smoke",
    accessLevel: "admin_only",
  },
});
await mediaStoragePersistenceService.create(realStorageObject);
const realAsset = await mediaAssetPersistenceService.create({
  assetId: `asset-real-processing-smoke-${Date.now()}`,
  ownerType: "media_library",
  ownerId: "unassigned",
  assetType: "cover_art",
  title: "Real Processing Smoke",
  url: realStorageObject.storagePath,
  status: "draft",
  assignmentStatus: "unassigned",
  createdAt: now,
  updatedAt: now,
});
realStorageObject.assetId = realAsset.assetId;
await mediaStoragePersistenceService.update(realStorageObject.storageObjectId, { assetId: realAsset.assetId });
const realProcessing = await mediaProcessingEnqueueService.enqueuePostUploadJobs({ mediaAsset: realAsset, storageObject: realStorageObject, uploadJobId: "upload-real-smoke", actorId: "smoke" });
const imageWorker = new ImageProcessingWorker();
const imageJobs = (await mediaProcessingJobService.getJobsForAsset(realAsset.assetId)).filter((job) => job.queueName === "media-image-processing");
const imageResults = [];
for (const job of imageJobs) imageResults.push(await imageWorker.processJob(job));
const realSummary = await mediaProcessingJobService.buildAssetProcessingSummary(realAsset.assetId);
if (!imageResults.some((job) => job?.jobType === "image_derivatives" && job.outputs.some((output) => output.status === "ready" && output.storageObjectId))) {
  throw new Error("Real image derivatives were not generated.");
}
console.log(JSON.stringify({
  success: true,
  queuedJobs: processing.queuedJobs.length,
  processedJobStatus: processed.status,
  summaryStatus: summary.overallStatus,
  realImageQueuedJobs: realProcessing.queuedJobs.length,
  realImageProcessedJobs: imageResults.filter(Boolean).length,
  realImageSummaryStatus: realSummary.overallStatus,
}, null, 2));

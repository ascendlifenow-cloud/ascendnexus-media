import type { MediaAsset, MediaStorageObject } from "../../models/mediaModels";
import { mediaProcessingJobService } from "./MediaProcessingJobService";

export class MediaProcessingEnqueueService {
  async enqueuePostUploadJobs(input: {
    mediaAsset: MediaAsset;
    storageObject: MediaStorageObject;
    uploadJobId?: string;
    actorId?: string;
  }) {
    const { mediaAsset, storageObject, uploadJobId, actorId } = input;
    const baseInput = {
      assetId: mediaAsset.assetId,
      storageObjectId: storageObject.storageObjectId,
      sourceStoragePath: storageObject.storagePath,
      sourceUrl: undefined,
      assetType: storageObject.assetType,
      mediaCategory: storageObject.mediaCategory,
      requestedOutputs: [],
      accessLevel: storageObject.accessLevel,
      metadata: { fullSongPrivate: storageObject.assetType === "full_song" },
    };
    const jobs = [];
    jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
      assetId: mediaAsset.assetId,
      storageObjectId: storageObject.storageObjectId,
      uploadJobId,
      jobType: "checksum_verify",
      input: { ...baseInput, requestedOutputs: ["checksum"] },
      required: true,
      createdBy: actorId,
    }));
    if (storageObject.mediaCategory === "image") {
      jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
        assetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        uploadJobId,
        jobType: "image_metadata",
        input: { ...baseInput, requestedOutputs: ["metadata"] },
        required: true,
        createdBy: actorId,
      }));
      jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
        assetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        uploadJobId,
        jobType: "image_derivatives",
        input: { ...baseInput, requestedOutputs: ["image_thumbnail", "image_card", "image_feature"] },
        required: false,
        createdBy: actorId,
      }));
      jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
        assetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        uploadJobId,
        jobType: "blur_placeholder",
        input: { ...baseInput, requestedOutputs: ["blur_placeholder"] },
        required: false,
        createdBy: actorId,
      }));
    }
    if (storageObject.mediaCategory === "audio") {
      jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
        assetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        uploadJobId,
        jobType: "audio_metadata",
        input: { ...baseInput, requestedOutputs: ["metadata"] },
        required: true,
        createdBy: actorId,
      }));
      jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
        assetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        uploadJobId,
        jobType: "audio_waveform",
        input: { ...baseInput, requestedOutputs: ["audio_waveform_json"] },
        required: false,
        createdBy: actorId,
      }));
      jobs.push(await mediaProcessingJobService.createAndEnqueueJob({
        assetId: mediaAsset.assetId,
        storageObjectId: storageObject.storageObjectId,
        uploadJobId,
        jobType: "audio_transcode",
        input: { ...baseInput, requestedOutputs: ["audio_transcoded_mp3"] },
        required: false,
        createdBy: actorId,
      }));
    }
    return {
      queuedJobs: jobs.map((job) => ({ processingJobId: job.processingJobId, jobType: job.jobType, queueName: job.queueName, status: job.status })),
      processingStatus: jobs.length ? "queued" : "not_started",
      warnings: jobs.flatMap((job) => job.warnings),
    };
  }
}

export const mediaProcessingEnqueueService = new MediaProcessingEnqueueService();

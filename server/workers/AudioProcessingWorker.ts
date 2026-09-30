import type { MediaProcessingJob, MediaProcessingJobOutput } from "../models/mediaModels";
import { mediaBackendConfig } from "../config/mediaBackendConfig";
import { mediaStoragePersistenceService } from "../services/media/MediaStoragePersistenceService";
import { mediaAssetPersistenceService } from "../services/media/MediaAssetPersistenceService";
import { processAudioMetadata } from "../processors/audio/audioMetadataProcessor";
import { processAudioTranscode } from "../processors/audio/audioTranscodeProcessor";
import { processAudioWaveform } from "../processors/audio/audioWaveformProcessor";
import { BaseMediaWorker } from "./BaseMediaWorker";

export class AudioProcessingWorker extends BaseMediaWorker {
  constructor() {
    super("audio-processing-worker", "media-audio-processing", mediaBackendConfig.mediaAudioWorkerConcurrency);
  }

  protected async execute(job: MediaProcessingJob): Promise<MediaProcessingJobOutput[]> {
    const storageObject = await mediaStoragePersistenceService.get(job.storageObjectId);
    if (!storageObject) throw new Error("PROCESSING_SOURCE_NOT_FOUND: storage object not found.");
    if (job.jobType === "audio_metadata") {
      const outputs = await processAudioMetadata(storageObject);
      const asset = await mediaAssetPersistenceService.get(job.assetId);
      await mediaAssetPersistenceService.patch(job.assetId, {
        metadata: {
          ...(asset?.metadata ?? {}),
          audioMetadataReady: outputs.some((output) => output.status === "ready"),
          fullSongPrivate: storageObject.assetType === "full_song",
          audio: outputs.find((output) => output.outputType === "metadata")?.metadata,
        },
      });
      return outputs;
    }
    if (job.jobType === "audio_waveform") return processAudioWaveform(storageObject);
    return processAudioTranscode(storageObject);
  }
}

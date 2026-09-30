import type { PublicAudioPlaybackError } from "../../state/audio/audioPlayerTypes";

export const createAudioPlaybackError = (
  code: PublicAudioPlaybackError["code"],
  message: string,
  retryable = false,
  details: Partial<PublicAudioPlaybackError> = {},
): PublicAudioPlaybackError => ({
  code,
  message,
  retryable,
  ...details,
});

export const mapMediaError = (error: MediaError | null | undefined, releaseId?: string): PublicAudioPlaybackError => {
  if (!error) return createAudioPlaybackError("AUDIO_UNKNOWN_ERROR", "The audio preview could not play.", true, { releaseId });
  if (error.code === MediaError.MEDIA_ERR_ABORTED) return createAudioPlaybackError("AUDIO_ABORTED", "Audio preview loading was interrupted.", true, { releaseId });
  if (error.code === MediaError.MEDIA_ERR_NETWORK) return createAudioPlaybackError("AUDIO_NETWORK_ERROR", "The audio preview could not be loaded from the network.", true, { releaseId });
  if (error.code === MediaError.MEDIA_ERR_DECODE) return createAudioPlaybackError("AUDIO_DECODE_ERROR", "The audio preview format could not be decoded.", false, { releaseId });
  if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return createAudioPlaybackError("AUDIO_FORMAT_UNSUPPORTED", "This audio preview format is not supported by this browser.", false, { releaseId });
  return createAudioPlaybackError("AUDIO_UNKNOWN_ERROR", "The audio preview could not play.", true, { releaseId });
};


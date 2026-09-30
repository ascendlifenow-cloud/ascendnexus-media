export const secondsToTimestamp = (seconds?: number | null): string => {
  if (!Number.isFinite(seconds ?? Number.NaN) || seconds === undefined || seconds === null || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatAudioDuration = secondsToTimestamp;

export const isAudioPreviewLengthRecommended = (durationSeconds?: number | null): boolean =>
  Number.isFinite(durationSeconds ?? Number.NaN) && durationSeconds !== undefined && durationSeconds !== null && durationSeconds >= 5 && durationSeconds <= 120;

export const isFullSongLengthRecommended = (durationSeconds?: number | null): boolean =>
  Number.isFinite(durationSeconds ?? Number.NaN) && durationSeconds !== undefined && durationSeconds !== null && durationSeconds >= 30 && durationSeconds <= 20 * 60;

export const getAudioLengthWarning = (
  durationSeconds: number | null | undefined,
  kind: "audio_preview" | "full_song" | "custom_audio",
): string | undefined => {
  if (!Number.isFinite(durationSeconds ?? Number.NaN) || durationSeconds === undefined || durationSeconds === null) {
    return "Audio duration could not be detected.";
  }
  if (kind === "audio_preview") {
    if (durationSeconds < 5) return "Audio preview is shorter than the recommended 5 seconds.";
    if (durationSeconds > 120) return "Audio preview is longer than the recommended 120 seconds.";
  }
  if (kind === "full_song") {
    if (durationSeconds < 30) return "Full song audio is shorter than the recommended 30 seconds.";
    if (durationSeconds > 20 * 60) return "Full song audio is longer than the recommended 20 minutes.";
  }
  return undefined;
};

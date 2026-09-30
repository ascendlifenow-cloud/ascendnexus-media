export const formatAudioTime = (seconds?: number) => {
  if (!Number.isFinite(seconds) || seconds === undefined || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const isValidAudioPreviewUrl = (audioPreviewUrl?: string) =>
  typeof audioPreviewUrl === "string" && audioPreviewUrl.trim().length > 0;

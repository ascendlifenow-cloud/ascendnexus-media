export const formatAudioTime = (seconds?: number): string => {
  if (!Number.isFinite(seconds) || seconds === undefined || seconds < 0) return "--:--";
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const clampAudioTime = (seconds: number, duration?: number): number => {
  if (!Number.isFinite(seconds)) return 0;
  const max = Number.isFinite(duration) && duration && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(seconds, max));
};


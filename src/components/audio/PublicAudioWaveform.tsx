import { publicWaveformValidationService } from "../../services/audio/PublicWaveformValidationService";

interface PublicAudioWaveformProps {
  peaks?: number[];
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

const downsample = (peaks: number[], maxSamples = 96): number[] => {
  if (peaks.length <= maxSamples) return peaks;
  const bucketSize = Math.ceil(peaks.length / maxSamples);
  const samples: number[] = [];
  for (let index = 0; index < peaks.length; index += bucketSize) {
    samples.push(Math.max(...peaks.slice(index, index + bucketSize)));
  }
  return samples;
};

export function PublicAudioWaveform({ peaks, currentTime, duration, onSeek }: PublicAudioWaveformProps) {
  if (!publicWaveformValidationService.validateWaveformData(peaks) || !duration) return null;
  const samples = downsample(peaks ?? []);
  const progress = currentTime / duration;
  return (
    <button
      type="button"
      className="anm-focus flex h-16 w-full items-end gap-0.5 rounded-md border border-white/10 bg-white/[0.045] px-2 py-2"
      aria-label="Seek with audio waveform"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        onSeek(ratio * duration);
      }}
    >
      {samples.map((peak, index) => {
        const played = index / Math.max(samples.length - 1, 1) <= progress;
        return (
          <span
            key={`${index}-${peak}`}
            className={played ? "bg-cyanGlow" : "bg-white/22"}
            style={{ height: `${Math.max(8, peak * 100)}%`, width: `${100 / samples.length}%` }}
            aria-hidden="true"
          />
        );
      })}
    </button>
  );
}


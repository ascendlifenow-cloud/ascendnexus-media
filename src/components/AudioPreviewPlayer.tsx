import type { PublicSongRelease } from "../models/release";
import type { MediaAssetRecord } from "../models/admin";
import { mediaCdnService } from "../services/media";
import { useAnalytics } from "../hooks/useAnalytics";
import type { PublicAudioPreviewContract, PublicAudioReleaseSummary } from "../state/audio/audioPlayerTypes";
import { AudioUnavailableState } from "./AudioUnavailableState";
import { PublicAudioPlayer } from "./audio/PublicAudioPlayer";

interface AudioPreviewPlayerProps {
  releaseId: string;
  title: string;
  artistName: string;
  audioPreviewUrl?: string;
  mediaAsset?: MediaAssetRecord;
  durationSeconds?: number;
  waveformReady?: boolean;
  publicPlaybackAllowed?: boolean;
  analyticsSong?: PublicSongRelease;
  compact?: boolean;
  showProgress?: boolean;
  showTime?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
}

export function AudioPreviewPlayer({
  releaseId,
  title,
  artistName,
  audioPreviewUrl,
  mediaAsset,
  durationSeconds,
  waveformReady = false,
  publicPlaybackAllowed = true,
  analyticsSong,
  compact = false,
  showProgress = true,
  showTime = true,
  className,
  onPlay,
  onPause,
  onEnded,
  onError,
}: AudioPreviewPlayerProps) {
  const analytics = useAnalytics();
  const cdnAudioUrl = mediaAsset ? mediaCdnService.getBestPublicAudioUrl(mediaAsset, { publicPlaybackAllowed }) : undefined;
  const playableUrl = publicPlaybackAllowed ? (cdnAudioUrl ?? audioPreviewUrl) : undefined;
  const preview: PublicAudioPreviewContract | undefined = playableUrl
    ? {
        releaseId,
        url: playableUrl,
        durationSeconds,
        mimeType: typeof mediaAsset?.metadata?.mimeType === "string" ? mediaAsset.metadata.mimeType : undefined,
        waveformData: Array.isArray(mediaAsset?.metadata?.audioWaveform)
          ? mediaAsset.metadata.audioWaveform as number[]
          : undefined,
        version: typeof mediaAsset?.metadata?.version === "string" ? mediaAsset.metadata.version : undefined,
      }
    : undefined;
  const release: PublicAudioReleaseSummary = {
    releaseId,
    title,
    artistName,
    coverArtUrl: analyticsSong?.coverArtUrl,
    release: analyticsSong,
  };

  if (!publicPlaybackAllowed || !preview) return <AudioUnavailableState title={title} compact={compact} />;

  return (
    <PublicAudioPlayer
      release={release}
      preview={preview}
      compact={compact}
      showProgress={showProgress}
      showTime={showTime}
      showWaveform={waveformReady}
      className={className}
      onPlay={() => {
        if (analyticsSong) void analytics.trackAudioPreviewPlay(analyticsSong);
        onPlay?.();
      }}
    />
  );
}

import { useEffect, useState } from "react";
import { FileAudio2, FileImage, FileQuestion } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import { ArtistProfileImage } from "../../../components/media/ArtistProfileImage";
import { CoverArtImage } from "../../../components/media/CoverArtImage";
import { adminMediaService } from "../../../services/admin";
import { cx } from "../../../utils/format";
import { getMediaAssetPreviewType } from "../../utils/adminMediaUtils";

interface AdminMediaPreviewFrameProps {
  asset: MediaAssetRecord;
  compact?: boolean;
}

const isBrowserLoadableImageUrl = (value: string | null | undefined): value is string =>
  Boolean(value && (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/")));

export function AdminMediaPreviewFrame({ asset, compact = false }: AdminMediaPreviewFrameProps) {
  const [adminPreviewUrl, setAdminPreviewUrl] = useState<string | undefined>();
  const [previewError, setPreviewError] = useState<string | undefined>();
  const previewType = getMediaAssetPreviewType(asset);
  const src = asset.thumbnailUrl || asset.url || "";
  const sizeClass = compact ? "min-h-44" : "min-h-72";
  const isAudioAsset = ["audio_preview", "full_song", "stem", "instrumental", "vocal", "custom_audio"].includes(asset.assetType);

  useEffect(() => {
    let active = true;
    setAdminPreviewUrl(undefined);
    setPreviewError(undefined);
    if (!isAudioAsset && previewType !== "image") return;
    void adminMediaService.getMediaAssetPreviewUrl(asset).then((result) => {
      if (!active) return;
      if (result.ok) {
        setAdminPreviewUrl(result.data);
        return;
      }
      setPreviewError(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [asset, isAudioAsset, previewType]);

  if (compact) {
    const imageSrc = isBrowserLoadableImageUrl(adminPreviewUrl || src) ? adminPreviewUrl || src : undefined;
    const Icon = isAudioAsset ? FileAudio2 : previewType === "image" ? FileImage : FileQuestion;
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/24">
        {previewType === "image" && imageSrc ? (
          <img src={imageSrc} alt={asset.altText || asset.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <Icon className="h-6 w-6 text-anm-gold" aria-hidden />
            <span className="max-w-16 truncate text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/46">
              {isAudioAsset ? "Audio" : previewType === "image" ? "Image" : "Asset"}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (asset.assetType === "cover_art") {
    return (
      <CoverArtImage
        src={adminPreviewUrl || src}
        title={asset.title}
        alt={asset.altText}
        size="card"
        fallbackVariant="minimal"
        className={compact ? "w-full" : "max-w-md"}
      />
    );
  }

  if (asset.assetType === "artist_profile" || asset.assetType === "artist_banner") {
    return (
      <ArtistProfileImage
        src={adminPreviewUrl || src}
        artistName={asset.title}
        displayName={asset.title}
        alt={asset.altText}
        size="card"
        shape="rounded"
        fallbackVariant="minimal"
        aspectRatio={asset.assetType === "artist_banner" ? "16:9" : "1:1"}
        className={compact ? "w-full" : "max-w-md"}
      />
    );
  }

  if (previewType === "image" && isBrowserLoadableImageUrl(adminPreviewUrl || src)) {
    return (
      <div className={cx("overflow-hidden rounded-anm-card border border-white/10 bg-black/24", compact ? "w-full" : "max-w-md")}>
        <img src={adminPreviewUrl || src} alt={asset.altText || asset.title} className="aspect-square h-full w-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  if (isAudioAsset) {
    return (
      <div className={cx("rounded-md border border-white/10 bg-black/18 p-3", compact ? "w-full" : "max-w-md")}>
        <div className="flex items-center gap-2">
          <FileAudio2 className="h-5 w-5 text-anm-gold" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{compact ? "Audio Preview" : asset.title}</p>
            <p className="truncate text-xs text-white/44">{asset.assetType.replace(/_/g, " ")}</p>
          </div>
        </div>
        {adminPreviewUrl ? (
          <audio className="mt-3 w-full" controls preload="none" src={adminPreviewUrl} />
        ) : (
          <p className="mt-3 text-xs text-white/52" role="status">{previewError || "Preparing admin preview..."}</p>
        )}
      </div>
    );
  }

  const Icon = isAudioAsset ? FileAudio2 : previewType === "image" ? FileImage : FileQuestion;
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-anm-card border border-white/10 bg-black/24 p-6 text-center",
        sizeClass,
      )}
    >
      <Icon className="h-10 w-10 text-anm-gold" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-white">{isAudioAsset ? "Audio Preview Asset" : "Media Asset"}</p>
      <p className="mt-1 text-xs text-white/46">{isAudioAsset ? "No autoplay. Preview controls can be added later." : asset.url || "Missing URL"}</p>
    </div>
  );
}

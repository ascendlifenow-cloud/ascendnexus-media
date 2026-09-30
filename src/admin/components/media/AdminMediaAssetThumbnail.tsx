import { useEffect, useState } from "react";
import { FileImage } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import { CoverArtImage } from "../../../components/media/CoverArtImage";
import { adminMediaService } from "../../../services/admin";

interface AdminMediaAssetThumbnailProps {
  asset: MediaAssetRecord;
  className?: string;
}

const isImageLikeAsset = (asset: MediaAssetRecord): boolean =>
  ["cover_art", "artist_profile", "artist_character_art", "artist_banner", "custom_image", "promo_graphic", "gallery_image", "video_thumbnail", "social_preview", "logo", "fallback_image"].includes(asset.assetType);

export function AdminMediaAssetThumbnail({ asset, className }: AdminMediaAssetThumbnailProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    setPreviewUrl(undefined);
    if (!isImageLikeAsset(asset)) return;
    void adminMediaService.getMediaAssetPreviewUrl(asset).then((result) => {
      if (!active) return;
      setPreviewUrl(result.ok ? result.data : undefined);
    });
    return () => {
      active = false;
    };
  }, [asset]);

  if (!isImageLikeAsset(asset)) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/24">
        <FileImage className="h-5 w-5 text-white/42" aria-hidden />
      </div>
    );
  }

  return (
    <CoverArtImage
      src={previewUrl || asset.thumbnailUrl || asset.url}
      alt={asset.altText}
      title={asset.title}
      size="thumbnail"
      fallbackVariant="minimal"
      className={className}
    />
  );
}

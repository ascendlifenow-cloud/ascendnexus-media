import { useEffect, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import type { CdnUrlOptions, ImageDerivative } from "../../models/media";
import { mediaCdnService } from "../../services/media";
import {
  ArtistImageAspectRatio,
  ArtistImageFallbackVariant,
  ArtistImageShape,
  ArtistImageSize,
  getArtistImageAlt,
  getArtistImageFallback,
  getArtistImageUrl,
  isValidArtistImageUrl,
} from "../../utils/artistImageUtils";
import { cx } from "../../utils/format";
import { getImageDerivativeUrl } from "../../utils/media/imageDerivativeUtils";
import { ArtistImageFallback } from "./ArtistImageFallback";
import { ArtistImageFrame } from "./ArtistImageFrame";
import { ArtistImageGalleryReadyWrapper } from "./ArtistImageGalleryReadyWrapper";
import { ImageSkeleton } from "../loading/ImageSkeleton";

interface ArtistProfileImageProps {
  src?: string;
  alt?: string;
  artistName: string;
  displayName?: string;
  size?: ArtistImageSize;
  shape?: ArtistImageShape;
  priority?: boolean;
  className?: string;
  fallbackVariant?: ArtistImageFallbackVariant;
  aspectRatio?: ArtistImageAspectRatio;
  sizes?: string;
  derivatives?: ImageDerivative[];
  mediaAsset?: MediaAssetRecord;
  cdnOptions?: Partial<CdnUrlOptions>;
  onLoad?: () => void;
  onError?: () => void;
}

const preferredArtistDerivativeTypes: Record<ArtistImageSize, Array<ImageDerivative["type"]>> = {
  avatar: ["thumbnail"],
  thumbnail: ["thumbnail"],
  card: ["card", "thumbnail"],
  feature: ["feature", "card"],
  hero: ["hero", "feature", "card"],
  banner: ["banner", "hero", "feature", "card"],
};

export function ArtistProfileImage({
  src,
  alt,
  artistName,
  displayName,
  size = "card",
  shape = "rounded",
  priority = false,
  className,
  fallbackVariant = "default",
  aspectRatio = "1:1",
  sizes,
  derivatives,
  mediaAsset,
  cdnOptions,
  onLoad,
  onError,
}: ArtistProfileImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cdnAssetUrl = mediaAsset ? mediaCdnService.buildImageCdnUrl(mediaAsset, { derivativeType: preferredArtistDerivativeTypes[size][0], ...cdnOptions }) : undefined;
  const preferredSrc = cdnAssetUrl?.publicUrl ?? getImageDerivativeUrl(derivatives, preferredArtistDerivativeTypes[size], src);
  const responsiveSources = mediaAsset ? mediaCdnService.getResponsiveImageSources(mediaAsset, { derivativeType: preferredArtistDerivativeTypes[size][0], ...cdnOptions }) : [];
  const shouldUseImage = isValidArtistImageUrl(preferredSrc) && !hasError;
  const imageSrc = shouldUseImage ? getArtistImageUrl(preferredSrc) : getArtistImageFallback();
  const srcSet = responsiveSources.length ? responsiveSources.map((source) => `${source.src} ${source.width}w`).join(", ") : undefined;
  const resolvedAlt = alt ?? getArtistImageAlt(displayName, artistName);
  const isFallback = !shouldUseImage;
  const resolvedSizes =
    sizes ??
    (size === "avatar"
      ? "96px"
      : size === "thumbnail"
        ? "192px"
        : size === "hero" || size === "banner"
          ? "100vw"
          : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw");
  const fetchPriorityAttributes = { fetchpriority: priority ? "high" : "auto" } as unknown as ImgHTMLAttributes<HTMLImageElement>;

  useEffect(() => {
    setIsLoaded(false);
  }, [imageSrc]);

  return (
    <ArtistImageGalleryReadyWrapper artistName={displayName ?? artistName}>
      <ArtistImageFrame size={size} shape={shape} aspectRatio={aspectRatio} className={className}>
        {!isLoaded ? <ImageSkeleton aspectRatio={aspectRatio} rounded={shape !== "square"} className="absolute inset-0 h-full" /> : null}
        <img
          src={imageSrc}
          srcSet={srcSet}
          alt={resolvedAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...fetchPriorityAttributes}
          sizes={resolvedSizes}
          width={size === "avatar" ? 96 : size === "thumbnail" ? 192 : 800}
          height={size === "banner" ? 450 : size === "hero" ? 1000 : size === "avatar" ? 96 : size === "thumbnail" ? 192 : 800}
          className={cx("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", !isLoaded ? "opacity-0" : isFallback ? "opacity-95" : "opacity-100")}
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          onError={() => {
            if (!hasError) {
              setHasError(true);
              setIsLoaded(false);
              onError?.();
              if (import.meta.env.DEV) {
                console.warn(`Artist image failed to load for ${displayName ?? artistName}: ${preferredSrc}`);
              }
            }
          }}
        />
        {isFallback ? <ArtistImageFallback artistName={displayName ?? artistName} variant={fallbackVariant} /> : null}
      </ArtistImageFrame>
    </ArtistImageGalleryReadyWrapper>
  );
}

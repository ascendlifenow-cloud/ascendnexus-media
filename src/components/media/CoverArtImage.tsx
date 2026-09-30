import { useEffect, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import type { CdnUrlOptions, ImageDerivative } from "../../models/media";
import { mediaCdnService } from "../../services/media";
import { cx } from "../../utils/format";
import { ImageSkeleton } from "../loading/ImageSkeleton";
import {
  CoverArtAspectRatio,
  CoverArtFallbackVariant,
  CoverArtSize,
  getCoverArtAlt,
  getCoverArtFallback,
  getCoverArtUrl,
  isValidCoverArtUrl,
} from "../../utils/coverArtUtils";
import { getImageDerivativeUrl } from "../../utils/media/imageDerivativeUtils";
import { CoverArtFallback } from "./CoverArtFallback";
import { CoverArtFrame } from "./CoverArtFrame";
import { CoverArtLightboxReadyWrapper } from "./CoverArtLightboxReadyWrapper";

interface CoverArtImageProps {
  src?: string;
  alt?: string;
  title?: string;
  artistName?: string;
  size?: CoverArtSize;
  rounded?: boolean;
  priority?: boolean;
  className?: string;
  fallbackVariant?: CoverArtFallbackVariant;
  aspectRatio?: CoverArtAspectRatio;
  sizes?: string;
  derivatives?: ImageDerivative[];
  mediaAsset?: MediaAssetRecord;
  cdnOptions?: Partial<CdnUrlOptions>;
  onLoad?: () => void;
  onError?: () => void;
}

const preferredCoverDerivativeTypes: Record<CoverArtSize, Array<ImageDerivative["type"]>> = {
  thumbnail: ["thumbnail"],
  card: ["card", "thumbnail"],
  feature: ["feature", "card"],
  hero: ["hero", "feature", "social", "card"],
  detail: ["feature", "hero", "card"],
};

export function CoverArtImage({
  src,
  alt,
  title,
  artistName,
  size = "card",
  rounded = true,
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
}: CoverArtImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cdnAssetUrl = mediaAsset ? mediaCdnService.buildImageCdnUrl(mediaAsset, { derivativeType: preferredCoverDerivativeTypes[size][0], ...cdnOptions }) : undefined;
  const preferredSrc = cdnAssetUrl?.publicUrl ?? getImageDerivativeUrl(derivatives, preferredCoverDerivativeTypes[size], src);
  const responsiveSources = mediaAsset ? mediaCdnService.getResponsiveImageSources(mediaAsset, { derivativeType: preferredCoverDerivativeTypes[size][0], ...cdnOptions }) : [];
  const shouldUseImage = isValidCoverArtUrl(preferredSrc) && !hasError;
  const imageSrc = shouldUseImage ? getCoverArtUrl(preferredSrc) : getCoverArtFallback();
  const srcSet = responsiveSources.length ? responsiveSources.map((source) => `${source.src} ${source.width}w`).join(", ") : undefined;
  const resolvedAlt = alt ?? getCoverArtAlt(title, artistName);
  const isFallback = !shouldUseImage;
  const resolvedSizes = sizes ?? (size === "thumbnail" ? "160px" : size === "hero" || size === "detail" ? "100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw");
  const fetchPriorityAttributes = { fetchpriority: priority ? "high" : "auto" } as unknown as ImgHTMLAttributes<HTMLImageElement>;

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [preferredSrc]);

  return (
    <CoverArtLightboxReadyWrapper title={title}>
      <CoverArtFrame size={size} rounded={rounded} aspectRatio={aspectRatio} className={className}>
        {!isLoaded ? <ImageSkeleton aspectRatio={aspectRatio} rounded={rounded} className="absolute inset-0 h-full" /> : null}
        <img
          src={imageSrc}
          srcSet={srcSet}
          alt={resolvedAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...fetchPriorityAttributes}
          sizes={resolvedSizes}
          width={size === "thumbnail" ? 160 : 800}
          height={size === "thumbnail" ? 160 : 800}
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
                console.warn(`Cover art failed to load for ${title ?? "unknown release"}: ${preferredSrc}`);
              }
            }
          }}
        />
        {isFallback ? <CoverArtFallback title={title} variant={fallbackVariant} /> : null}
      </CoverArtFrame>
    </CoverArtLightboxReadyWrapper>
  );
}

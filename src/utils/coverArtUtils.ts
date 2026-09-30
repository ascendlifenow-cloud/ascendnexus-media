import fallbackCoverArt from "../assets/fallbacks/ascend-nexus-cover-fallback.png";

export type CoverArtSize = "thumbnail" | "card" | "feature" | "hero" | "detail";
export type CoverArtAspectRatio = "1:1" | "16:9" | "4:5" | "3:4";
export type CoverArtFallbackVariant = "default" | "minimal";

export const isValidCoverArtUrl = (coverArtUrl?: string) => {
  if (typeof coverArtUrl !== "string") return false;
  const value = coverArtUrl.trim();
  if (!value) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  );
};

export const getCoverArtFallback = () => fallbackCoverArt;

export const getCoverArtUrl = (coverArtUrl?: string) => {
  const value = coverArtUrl?.trim();
  if (!isValidCoverArtUrl(value)) return getCoverArtFallback();
  return value;
};

export const getCoverArtAlt = (title?: string, artistName?: string) => {
  if (title && artistName) return `${title} cover art by ${artistName}`;
  if (title) return `${title} cover art`;
  return "Ascend Nexus Media fallback cover art";
};

export const getCoverArtSizeClass = (size: CoverArtSize = "card") => {
  const sizeClasses: Record<CoverArtSize, string> = {
    thumbnail: "w-20",
    card: "w-full",
    feature: "w-full min-h-80",
    hero: "w-full",
    detail: "w-full",
  };

  return sizeClasses[size];
};

export const getCoverArtAspectClass = (aspectRatio: CoverArtAspectRatio = "1:1") => {
  const aspectClasses: Record<CoverArtAspectRatio, string> = {
    "1:1": "aspect-square",
    "16:9": "aspect-video",
    "4:5": "aspect-[4/5]",
    "3:4": "aspect-[3/4]",
  };

  return aspectClasses[aspectRatio];
};

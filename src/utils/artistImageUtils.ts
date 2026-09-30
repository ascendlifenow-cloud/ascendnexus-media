import fallbackArtistImage from "../assets/fallbacks/ascend-nexus-artist-fallback.png";

export type ArtistImageSize = "avatar" | "thumbnail" | "card" | "feature" | "hero" | "banner";
export type ArtistImageShape = "circle" | "rounded" | "square" | "wide";
export type ArtistImageAspectRatio = "1:1" | "16:9" | "4:5" | "3:4";
export type ArtistImageFallbackVariant = "default" | "minimal";

export const isValidArtistImageUrl = (profileImage?: string) => {
  if (typeof profileImage !== "string") return false;
  const value = profileImage.trim();
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

export const getArtistImageFallback = () => fallbackArtistImage;

export const getArtistImageUrl = (profileImage?: string) => {
  const value = profileImage?.trim();
  if (!isValidArtistImageUrl(value)) return getArtistImageFallback();
  return value;
};

export const getArtistImageAlt = (displayName?: string, artistName?: string) => {
  const name = displayName || artistName;
  return name ? `${name} artist portrait` : "Ascend Nexus Media artist image";
};

export const getArtistImageSizeClass = (size: ArtistImageSize = "card") => {
  const sizeClasses: Record<ArtistImageSize, string> = {
    avatar: "h-12 w-12",
    thumbnail: "h-24 w-24",
    card: "w-full",
    feature: "w-full min-h-80",
    hero: "w-full",
    banner: "w-full",
  };

  return sizeClasses[size];
};

export const getArtistImageShapeClass = (shape: ArtistImageShape = "rounded") => {
  const shapeClasses: Record<ArtistImageShape, string> = {
    circle: "rounded-full",
    rounded: "rounded-lg",
    square: "rounded-none",
    wide: "rounded-lg",
  };

  return shapeClasses[shape];
};

export const getArtistImageAspectClass = (aspectRatio: ArtistImageAspectRatio = "1:1") => {
  const aspectClasses: Record<ArtistImageAspectRatio, string> = {
    "1:1": "aspect-square",
    "16:9": "aspect-video",
    "4:5": "aspect-[4/5]",
    "3:4": "aspect-[3/4]",
  };

  return aspectClasses[aspectRatio];
};

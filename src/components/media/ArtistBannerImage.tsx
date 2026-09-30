import { ArtistProfileImage } from "./ArtistProfileImage";

interface ArtistBannerImageProps {
  src?: string;
  artistName: string;
  displayName?: string;
  priority?: boolean;
  className?: string;
}

export function ArtistBannerImage({ src, artistName, displayName, priority, className }: ArtistBannerImageProps) {
  return (
    <ArtistProfileImage
      src={src}
      artistName={artistName}
      displayName={displayName}
      size="banner"
      shape="wide"
      aspectRatio="16:9"
      priority={priority}
      className={className}
    />
  );
}

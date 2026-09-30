import { ArtistProfileImage } from "./ArtistProfileImage";

interface ArtistAvatarProps {
  src?: string;
  artistName: string;
  displayName?: string;
  priority?: boolean;
  className?: string;
}

export function ArtistAvatar({ src, artistName, displayName, priority, className }: ArtistAvatarProps) {
  return (
    <ArtistProfileImage
      src={src}
      artistName={artistName}
      displayName={displayName}
      size="avatar"
      shape="circle"
      priority={priority}
      fallbackVariant="minimal"
      className={className}
    />
  );
}

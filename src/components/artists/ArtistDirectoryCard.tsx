import { ArtistPreviewCard } from "./ArtistPreviewCard";
import type { ArtistCardProps } from "./artistCardTypes";

export function ArtistDirectoryCard(props: ArtistCardProps) {
  return <ArtistPreviewCard {...props} variant="directory" />;
}

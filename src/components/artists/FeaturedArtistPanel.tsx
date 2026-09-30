import { ArtistPreviewCard } from "./ArtistPreviewCard";
import type { ArtistCardProps } from "./artistCardTypes";

export function FeaturedArtistPanel(props: ArtistCardProps) {
  return <ArtistPreviewCard {...props} variant="featured" maxTags={props.maxTags ?? 4} />;
}

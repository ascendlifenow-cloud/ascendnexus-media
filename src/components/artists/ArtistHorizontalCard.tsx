import { ArtistPreviewCard } from "./ArtistPreviewCard";
import type { ArtistCardProps } from "./artistCardTypes";

export function ArtistHorizontalCard(props: ArtistCardProps) {
  return <ArtistPreviewCard {...props} variant="horizontal" />;
}

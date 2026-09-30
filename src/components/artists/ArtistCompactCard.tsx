import { ArtistPreviewCard } from "./ArtistPreviewCard";
import type { ArtistCardProps } from "./artistCardTypes";

export function ArtistCompactCard(props: ArtistCardProps) {
  return <ArtistPreviewCard {...props} variant="compact" />;
}

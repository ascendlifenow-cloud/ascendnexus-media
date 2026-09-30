import type { ArtistSpotlightItem } from "../../models/homepage";
import { ArtistPreviewCard } from "./ArtistPreviewCard";
import type { ArtistCardProps } from "./artistCardTypes";

interface ArtistSpotlightCardProps extends Omit<ArtistCardProps, "artist" | "latestRelease" | "primaryGenre" | "styleTags"> {
  item?: ArtistSpotlightItem;
}

export function ArtistSpotlightCard({ item, ...props }: ArtistSpotlightCardProps) {
  return (
    <ArtistPreviewCard
      {...props}
      artist={item?.artist}
      variant="spotlight"
      primaryGenre={item?.primaryGenre}
      styleTags={item?.styleTags}
      latestRelease={item?.latestRelease}
    />
  );
}

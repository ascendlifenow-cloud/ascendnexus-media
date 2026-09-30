import type { ArtistSpotlightItem } from "../models/homepage";
import { ArtistSpotlightCard } from "./ArtistSpotlightCard";

interface ArtistSpotlightGridProps {
  items: ArtistSpotlightItem[];
}

export function ArtistSpotlightGrid({ items }: ArtistSpotlightGridProps) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ArtistSpotlightCard key={item.artist.artistId} item={item} />
      ))}
    </div>
  );
}

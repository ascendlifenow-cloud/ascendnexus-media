import type { ArtistPublicProfile } from "../models/artist";
import { ArtistDirectoryCard } from "./artists";

interface ArtistGridProps {
  artists: ArtistPublicProfile[];
}

export function ArtistGrid({ artists }: ArtistGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {artists.map((artist) => (
        <ArtistDirectoryCard key={artist.artistId} artist={artist} />
      ))}
    </div>
  );
}

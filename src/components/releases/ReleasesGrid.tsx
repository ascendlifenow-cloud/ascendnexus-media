import { SongGridCard } from "../songs";
import type { CatalogReleaseItem } from "../../services/ReleaseCatalogService";

interface ReleasesGridProps {
  releases: CatalogReleaseItem[];
}

export function ReleasesGrid({ releases }: ReleasesGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {releases.map(({ release, artist }) => (
        <SongGridCard
          key={release.releaseId}
          release={release}
          artist={artist}
          showArtist
          showAudioPreview
          showGenre
          showReleaseDate
          showTags
        />
      ))}
    </div>
  );
}

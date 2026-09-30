import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { RelatedSongCard } from "./songs";

interface MoreFromArtistSectionProps {
  artist?: ArtistPublicProfile;
  releases: PublicSongRelease[];
}

export function MoreFromArtistSection({ artist, releases }: MoreFromArtistSectionProps) {
  if (!artist || releases.length === 0) return null;

  return (
    <section className="bg-night py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">More From This Artist</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Continue with {artist.displayName}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {releases.map((release) => (
            <RelatedSongCard key={release.releaseId} artist={artist} release={release} />
          ))}
        </div>
      </div>
    </section>
  );
}

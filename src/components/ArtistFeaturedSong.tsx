import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { EmptyState } from "./EmptyState";
import { FeaturedReleaseCard } from "./songs";

interface ArtistFeaturedSongProps {
  release?: PublicSongRelease;
  artist?: ArtistPublicProfile;
}

export function ArtistFeaturedSong({ release, artist }: ArtistFeaturedSongProps) {
  if (!release) {
    return (
      <section className="bg-night py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <EmptyState title="No featured song yet" message="The newest published release will appear here when this artist has public music." />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-night py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Featured Song</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Artist selected release</h2>
        </div>
        <FeaturedReleaseCard release={release} artist={artist} showArtist={Boolean(artist)} />
      </div>
    </section>
  );
}

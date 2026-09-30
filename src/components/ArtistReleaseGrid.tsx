import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { EmptyState } from "./EmptyState";
import { SongGridCard } from "./songs";

interface ArtistReleaseGridProps {
  artist: ArtistPublicProfile;
  releases: PublicSongRelease[];
}

export function ArtistReleaseGrid({ artist, releases }: ArtistReleaseGridProps) {
  return (
    <section id="latest-releases" className="scroll-mt-24 bg-ink py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Latest Releases</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Published catalog</h2>
          <p className="mt-3 text-base leading-7 text-white/64">Only published songs are shown, newest first.</p>
        </div>
        {releases.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {releases.map((release) => (
              <SongGridCard key={release.releaseId} artist={artist} release={release} />
            ))}
          </div>
        ) : (
          <EmptyState title="No published releases" message="This artist does not have public songs yet." />
        )}
      </div>
    </section>
  );
}

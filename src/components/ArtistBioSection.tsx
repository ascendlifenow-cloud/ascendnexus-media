import type { ArtistPublicProfile } from "../models/artist";

interface ArtistBioSectionProps {
  artist: ArtistPublicProfile;
}

export function ArtistBioSection({ artist }: ArtistBioSectionProps) {
  return (
    <section className="bg-ink py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Biography</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">The public artist profile</h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-black/20">
          <p className="text-lg leading-8 text-white/74">{artist.bio}</p>
          <blockquote className="mt-6 border-l-2 border-amberGlow pl-5 text-base leading-7 text-white/64">
            A future-ready space for artist statements, creative notes, and evolving persona lore.
          </blockquote>
        </div>
      </div>
    </section>
  );
}

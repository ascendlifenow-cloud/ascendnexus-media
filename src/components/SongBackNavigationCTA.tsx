import { ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { ArtistPublicProfile } from "../models/artist";

interface SongBackNavigationCTAProps {
  artist?: ArtistPublicProfile;
}

export function SongBackNavigationCTA({ artist }: SongBackNavigationCTAProps) {
  return (
    <section className="bg-[linear-gradient(135deg,#121827,#113342_50%,#2c1731)] py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Keep exploring Ascend Nexus Media</h2>
          <p className="mt-3 text-base leading-7 text-white/70">Move from this release into the artist profile or the full public roster.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {artist ? (
            <Link
              to={`/artists/${artist.slug}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/16 px-5 text-sm font-bold text-white transition hover:bg-white hover:text-ink focus:outline-none focus:ring-2 focus:ring-cyanGlow/60"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Artist
            </Link>
          ) : null}
          <Link
            to="/artists"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-ink transition hover:bg-cyanGlow focus:outline-none focus:ring-2 focus:ring-cyanGlow/60"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Explore All Artists
          </Link>
        </div>
      </div>
    </section>
  );
}

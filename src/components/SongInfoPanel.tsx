import { CalendarDays, CheckCircle2, Disc3, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { getVisibleExternalLinks } from "../utils/externalLinksUtils";
import { formatReleaseDate } from "../utils/format";

interface SongInfoPanelProps {
  song: PublicSongRelease;
  artist?: ArtistPublicProfile;
}

export function SongInfoPanel({ song, artist }: SongInfoPanelProps) {
  const externalLinkCount = getVisibleExternalLinks(song.externalLinks).length;

  return (
    <section className="bg-ink py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
            <Disc3 className="h-6 w-6 text-cyanGlow" aria-hidden="true" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/44">Song</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{song.title}</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
            <UserRound className="h-6 w-6 text-amberGlow" aria-hidden="true" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/44">Artist</p>
            {artist ? (
              <Link to={`/artists/${artist.slug}`} className="mt-2 block text-xl font-semibold text-white transition hover:text-cyanGlow">
                {artist.displayName}
              </Link>
            ) : (
              <p className="mt-2 text-xl font-semibold text-white/70">Artist unavailable</p>
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
            <CalendarDays className="h-6 w-6 text-cyanGlow" aria-hidden="true" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/44">Released</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatReleaseDate(song.releaseDate)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden="true" />
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/44">Availability</p>
            <p className="mt-2 text-xl font-semibold text-white">{externalLinkCount > 0 ? `${externalLinkCount} link${externalLinkCount === 1 ? "" : "s"}` : "Public page"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

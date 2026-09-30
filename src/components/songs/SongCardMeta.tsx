import { CalendarDays, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import type { PublicSongRelease } from "../../models/release";
import { formatReleaseDate } from "../../utils/format";
import type { SongCardArtistData } from "./songCardTypes";

interface SongCardMetaProps {
  release: PublicSongRelease;
  artist?: SongCardArtistData;
  showArtist?: boolean;
  showGenre?: boolean;
  showReleaseDate?: boolean;
  compact?: boolean;
}

export function SongCardMeta({
  release,
  artist,
  showArtist = true,
  showGenre = true,
  showReleaseDate = true,
  compact = false,
}: SongCardMetaProps) {
  const formattedDate = formatReleaseDate(release.releaseDate);
  const artistName = artist?.artistName?.trim();
  const artistPath = artist?.artistSlug ? `/artists/${artist.artistSlug}` : undefined;
  const genre = release.genre?.trim();

  if (!showArtist && !showGenre && !showReleaseDate) return null;

  return (
    <div className={compact ? "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/56" : "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/62"}>
      {showArtist && artistName ? (
        artistPath ? (
          <Link to={artistPath} className="anm-focus rounded-sm transition hover:text-cyanGlow">
            {artistName}
          </Link>
        ) : (
          <span>{artistName}</span>
        )
      ) : null}
      {showGenre && genre ? (
        <span className="inline-flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          {genre}
        </span>
      ) : null}
      {showReleaseDate && formattedDate ? (
        <time dateTime={release.releaseDate} className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formattedDate}
        </time>
      ) : null}
    </div>
  );
}

import { CalendarDays, Disc3, Play, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { formatReleaseDate } from "../utils/format";
import { isPlayablePreviewAvailable } from "../utils/releaseCatalog";
import { CoverArtImage } from "./media/CoverArtImage";
import { SongStyleTags } from "./SongStyleTags";
import { Button } from "./ui/Button";
import { LinkButton } from "./ui/LinkButton";

interface SongHeroProps {
  song: PublicSongRelease;
  artist?: ArtistPublicProfile;
  onPlayPreview: () => void;
}

export function SongHero({ song, artist, onPlayPreview }: SongHeroProps) {
  const previewAvailable = isPlayablePreviewAvailable(song.audioPreviewUrl);
  const artistName = artist?.displayName ?? "Ascend Nexus Media Artist";

  return (
    <section className="relative overflow-hidden bg-anm-page-gradient pt-32">
      <div className="absolute inset-0 bg-anm-sunrise-glow" />
      <div className="relative anm-container grid gap-10 pb-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <CoverArtImage
          src={song.coverArtUrl}
          title={song.title}
          artistName={artistName}
          size="hero"
          priority
          alt={`${song.title} cover art by ${artistName}`}
          className="shadow-glow"
        />
        <div>
          <p className="anm-eyebrow">{song.genre || "Song Release"}</p>
          <h1 className="anm-page-title mt-4">{song.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-base text-white/66">
            {artist ? (
              <Link
                to={`/artists/${artist.slug}`}
                className="inline-flex items-center gap-2 rounded-md font-semibold text-anm-blue transition hover:text-white anm-focus"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {artistName}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {artistName}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatReleaseDate(song.releaseDate)}
            </span>
          </div>
          <div className="mt-6">
            <SongStyleTags genre={song.genre} styleTags={song.styleTags} />
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={onPlayPreview}
              disabled={!previewAvailable}
              aria-label={previewAvailable ? `Jump to audio preview for ${song.title}` : `Preview coming soon for ${song.title}`}
              variant="primary"
              size="lg"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Play Preview
            </Button>
            {artist ? (
              <LinkButton
                to={`/artists/${artist.slug}`}
                variant="ghost"
                size="lg"
              >
                <Disc3 className="h-4 w-4" aria-hidden="true" />
                View Artist
              </LinkButton>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

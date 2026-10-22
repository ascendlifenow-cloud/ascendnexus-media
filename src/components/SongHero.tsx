import { CalendarDays, Disc3, Music2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { formatReleaseDate } from "../utils/format";
import { CoverArtImage } from "./media/CoverArtImage";
import { SongStyleTags } from "./SongStyleTags";
import { ExternalLinksPanel } from "./links";
import { SongPlaybackActions } from "./songs/SongPlaybackActions";
import { MemberProtectedAudioPlayer } from "../member/components/media/MemberProtectedAudioPlayer";
import { Button } from "./ui/Button";
import { LinkButton } from "./ui/LinkButton";

interface SongHeroProps {
  song: PublicSongRelease;
  artist?: ArtistPublicProfile;
  onPlayPreview?: () => void;
}

export function SongHero({ song, artist, onPlayPreview }: SongHeroProps) {
  const artistName = artist?.displayName ?? "Ascend Nexus Media Artist";
  const [lyricsOpen, setLyricsOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-anm-page-gradient pt-32">
      <div className="absolute inset-0 bg-anm-sunrise-glow" />
      <div className="relative anm-container grid gap-10 pb-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <CoverArtImage
          src={song.coverArtLargeUrl ?? song.coverArtUrl ?? song.coverArtThumbnailUrl}
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
          <div className="mt-8">
            <SongPlaybackActions release={{
              releaseId: song.releaseId,
              title: song.title,
              slug: song.slug,
              artistId: song.artistId,
              artistName,
              coverArtUrl: song.coverArtUrl,
              coverArtThumbnailUrl: song.coverArtThumbnailUrl,
              audioPreviewUrl: song.audioPreviewUrl,
              release: song,
            }} onPreviewPlay={onPlayPreview} />
          </div>
          <div className="mt-3">
            <MemberProtectedAudioPlayer releaseSlug={song.slug} title={song.title} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setLyricsOpen((value) => !value)} variant="ghost" size="lg" aria-expanded={lyricsOpen}>
              <Music2 className="h-4 w-4" aria-hidden="true" /> Lyrics
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
          <div className="mt-5">
            <ExternalLinksPanel links={song.externalLinks} eyebrow="Listen on" contextLabel={song.title} compact hideWhenEmpty />
          </div>
          {lyricsOpen ? (
            <div className="mt-6 max-h-72 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-5" role="region" aria-label={`${song.title} lyrics`}>
              <p className="whitespace-pre-line text-sm leading-7 text-white/72">{song.lyrics || "Lyrics and song notes will be added soon."}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

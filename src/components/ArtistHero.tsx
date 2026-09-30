import { Disc3, ListMusic, Play } from "lucide-react";
import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { ArtistProfileImage } from "./media/ArtistProfileImage";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { LinkButton } from "./ui/LinkButton";

interface ArtistHeroProps {
  artist: ArtistPublicProfile;
  latestRelease?: PublicSongRelease;
  genres: string[];
  onViewSongs: () => void;
}

export function ArtistHero({ artist, latestRelease, genres, onViewSongs }: ArtistHeroProps) {
  return (
    <section className="relative overflow-hidden bg-anm-page-gradient pt-32">
      <div className="absolute inset-0 bg-anm-purple-glow" />
      <div className="relative anm-container grid gap-10 pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <ArtistProfileImage
          src={artist.profileImage}
          artistName={artist.name}
          displayName={artist.displayName}
          size="hero"
          shape="rounded"
          aspectRatio="4:5"
          priority
          alt={`${artist.displayName} artist portrait`}
          className="shadow-glow"
        />
        <div>
          <p className="anm-eyebrow">AI Persona Artist</p>
          <h1 className="anm-page-title mt-4">{artist.displayName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">{artist.bio}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(genres.length ? genres : [artist.musicStyle]).slice(0, 5).map((tag) => (
              <Badge key={tag} variant="purple" className="text-sm">{tag}</Badge>
            ))}
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {latestRelease ? (
              <LinkButton to={`/songs/${latestRelease.slug}`} variant="primary" size="lg">
                <Play className="h-4 w-4" aria-hidden="true" />
                Listen to Latest
              </LinkButton>
            ) : null}
            <Button
              type="button"
              onClick={onViewSongs}
              variant="ghost"
              size="lg"
            >
              <ListMusic className="h-4 w-4" aria-hidden="true" />
              View All Songs
            </Button>
          </div>
          {latestRelease ? (
            <div className="mt-8 inline-flex items-center gap-3 rounded-anm-card border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/70 backdrop-blur">
              <Disc3 className="h-5 w-5 text-amberGlow" aria-hidden="true" />
              Latest release: <span className="font-semibold text-white">{latestRelease.title}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

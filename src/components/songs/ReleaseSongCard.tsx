import { Radio } from "lucide-react";
import { cx } from "../../utils/format";
import { CoverArtImage } from "../media/CoverArtImage";
import { Card } from "../ui/Card";
import { SongCardActions } from "./SongCardActions";
import { SongCardMeta } from "./SongCardMeta";
import { SongCardTags } from "./SongCardTags";
import { getSongCardArtistData, type SongCardProps } from "./songCardTypes";

const variantClasses = {
  carousel: "group flex h-full min-h-[27rem] flex-col overflow-hidden",
  grid: "group flex h-full min-h-[27rem] flex-col overflow-hidden",
  compact: "group flex h-full gap-4 overflow-hidden p-4 sm:items-center",
  featured: "grid overflow-hidden lg:grid-cols-[0.62fr_1fr]",
  related: "group flex h-full flex-col overflow-hidden",
};

export function ReleaseSongCard({
  release,
  artist,
  variant = "grid",
  showArtist = true,
  showAudioPreview = true,
  showTags = true,
  showGenre = true,
  showReleaseDate = true,
  maxTags = 3,
  className,
  onOpen,
  onPreviewPlay,
}: SongCardProps) {
  const artistData = getSongCardArtistData(artist);

  if (!release) {
    return (
      <Card as="article" variant="compact" className={cx("p-5 text-sm leading-6 text-white/62", className)}>
        Release details are unavailable.
      </Card>
    );
  }

  const title = release.title?.trim() || "Untitled release";
  const artistName = artistData.artistName || "Ascend Nexus Media";
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const isRelated = variant === "related";

  if (isCompact) {
    return (
      <Card as="article" variant="song" interactive className={cx(variantClasses.compact, className)}>
        <CoverArtImage
          src={release.coverArtUrl}
          title={title}
          artistName={artistName}
          size="thumbnail"
          alt={`${title} cover art${artistName ? ` by ${artistName}` : ""}`}
          className="w-24 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">{title}</h3>
          <SongCardMeta release={release} artist={artistData} showArtist={showArtist} showGenre={showGenre} showReleaseDate={showReleaseDate} compact />
          <div className="mt-4">
            <SongCardActions
              release={release}
              artistName={artistName}
              showAudioPreview={showAudioPreview}
              compactPreview
              openLabel="Open"
              onOpen={onOpen}
              onPreviewPlay={onPreviewPlay}
            />
          </div>
        </div>
      </Card>
    );
  }

  if (isFeatured) {
    return (
      <Card as="article" variant="feature" className={cx(variantClasses.featured, className)}>
        <CoverArtImage
          src={release.coverArtUrl}
          title={title}
          artistName={artistName}
          size="feature"
          rounded={false}
          alt={`${title} cover artwork${artistName ? ` by ${artistName}` : ""}`}
        />
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <SongCardMeta release={release} artist={artistData} showArtist={showArtist} showGenre={showGenre} showReleaseDate={showReleaseDate} />
          <h3 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{title}</h3>
          {showTags ? <SongCardTags tags={release.styleTags} maxTags={maxTags} className="mt-5 flex flex-wrap gap-2" /> : null}
          <div className="mt-8">
            <SongCardActions
              release={release}
              artistName={artistName}
              showAudioPreview={showAudioPreview}
              compactPreview={false}
              openLabel="Open Song"
              onOpen={onOpen}
              onPreviewPlay={onPreviewPlay}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card as="article" variant="song" interactive className={cx(variantClasses[variant], className)}>
      <div className="relative">
        <CoverArtImage
          src={release.coverArtUrl}
          title={title}
          artistName={artistName}
          size="card"
          alt={`${title} cover art${artistName ? ` by ${artistName}` : ""}`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/68 via-black/10 to-transparent" />
        <div className="absolute inset-x-5 bottom-5">
          {showGenre && release.genre ? (
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-white/84">
              <Radio className="h-4 w-4" aria-hidden="true" />
              {release.genre}
            </div>
          ) : null}
          <h3 className={cx("mt-2 font-semibold leading-tight text-white", isRelated ? "text-xl" : "text-2xl")}>{title}</h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <SongCardMeta
          release={release}
          artist={artistData}
          showArtist={showArtist}
          showGenre={false}
          showReleaseDate={showReleaseDate}
        />
        {showTags && !isRelated ? <SongCardTags tags={release.styleTags} maxTags={maxTags} /> : null}
        <div className="mt-auto pt-6">
          <SongCardActions
            release={release}
            artistName={artistName}
            showAudioPreview={showAudioPreview && !isRelated}
            compactPreview
            openLabel={isRelated ? "Open" : "Open Song"}
            onOpen={onOpen}
            onPreviewPlay={onPreviewPlay}
          />
        </div>
      </div>
    </Card>
  );
}

import { cx } from "../../utils/format";
import { ArtistAvatar } from "../media/ArtistAvatar";
import { ArtistProfileImage } from "../media/ArtistProfileImage";
import { Card } from "../ui/Card";
import { ArtistCardActions } from "./ArtistCardActions";
import { ArtistCardMeta } from "./ArtistCardMeta";
import { ArtistCardTags } from "./ArtistCardTags";
import { getLatestReleaseData, type ArtistCardProps } from "./artistCardTypes";

const bioFallback = "Artist profile coming soon.";

const variantClasses = {
  directory: "group flex h-full flex-col overflow-hidden focus-within:border-anm-blue",
  spotlight: "group flex h-full flex-col overflow-hidden focus-within:border-anm-pink/60",
  compact: "group flex items-center gap-3 overflow-hidden p-4",
  featured: "grid overflow-hidden lg:grid-cols-[0.78fr_1fr]",
  horizontal: "group flex gap-4 overflow-hidden p-4 sm:items-center",
};

export function ArtistPreviewCard({
  artist,
  variant = "directory",
  primaryGenre,
  styleTags,
  latestRelease,
  showBio = true,
  showTags = true,
  showLatestRelease = true,
  maxTags = 3,
  className,
  onOpen,
}: ArtistCardProps) {
  if (!artist || artist.status === "archived") {
    return (
      <Card as="article" variant="compact" className={cx("p-5 text-sm leading-6 text-white/62", className)}>
        Artist details are unavailable.
      </Card>
    );
  }

  const displayName = artist.displayName?.trim() || artist.name?.trim() || "Untitled artist";
  const bio = artist.bio?.trim() || bioFallback;
  const latest = getLatestReleaseData(latestRelease);
  const latestTitle = latest?.title?.trim() || "New music coming soon";
  const cardTags = styleTags?.length ? styleTags : artist.musicStyle ? artist.musicStyle.split(",").map((tag) => tag.trim()) : [];

  if (variant === "compact") {
    return (
      <Card as="article" variant="compact" interactive className={cx(variantClasses.compact, className)}>
        <ArtistAvatar src={artist.profileImage} artistName={artist.name} displayName={displayName} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">{displayName}</h3>
          {primaryGenre ? <p className="mt-1 truncate text-xs text-white/56">{primaryGenre}</p> : null}
        </div>
        <ArtistCardActions artist={artist} latestRelease={latest} showLatestRelease={false} compact onOpen={onOpen} />
      </Card>
    );
  }

  if (variant === "horizontal") {
    return (
      <Card as="article" variant="artist" interactive className={cx(variantClasses.horizontal, className)}>
        <ArtistProfileImage
          src={artist.profileImage}
          artistName={artist.name}
          displayName={displayName}
          size="thumbnail"
          shape="rounded"
          alt={`${displayName} artist portrait`}
          className="w-28 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <ArtistCardMeta primaryGenre={primaryGenre} compact />
          <h3 className="mt-3 text-xl font-semibold text-white">{displayName}</h3>
          {showBio ? <p className="line-clamp-2 mt-2 text-sm leading-6 text-white/64">{bio}</p> : null}
          <div className="mt-4">
            <ArtistCardActions artist={artist} latestRelease={latest} showLatestRelease={showLatestRelease} compact onOpen={onOpen} />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === "featured") {
    return (
      <Card as="article" variant="feature" className={cx(variantClasses.featured, className)}>
        <ArtistProfileImage
          src={artist.profileImage}
          artistName={artist.name}
          displayName={displayName}
          size="hero"
          shape="square"
          aspectRatio="4:5"
          alt={`${displayName} artist portrait`}
        />
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <ArtistCardMeta primaryGenre={primaryGenre} />
          <h3 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{displayName}</h3>
          {showBio ? <p className="line-clamp-4 mt-4 text-base leading-7 text-white/68">{bio}</p> : null}
          {showTags ? <ArtistCardTags tags={cardTags} maxTags={maxTags} /> : null}
          {showLatestRelease ? (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/46">Latest Release</p>
              <p className="mt-2 text-sm font-semibold text-cyan-100">{latestTitle}</p>
            </div>
          ) : null}
          <div className="mt-6">
            <ArtistCardActions artist={artist} latestRelease={latest} showLatestRelease={showLatestRelease} onOpen={onOpen} />
          </div>
        </div>
      </Card>
    );
  }

  const isSpotlight = variant === "spotlight";

  return (
    <Card as="article" variant="artist" interactive className={cx(variantClasses[variant], className)}>
      <div className="relative">
        <ArtistProfileImage
          src={artist.profileImage}
          artistName={artist.name}
          displayName={displayName}
          size="card"
          shape="square"
          aspectRatio="4:5"
          alt={`${displayName} artist portrait`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/68 via-black/12 to-transparent" />
        <div className={cx("absolute left-4 right-4", isSpotlight ? "top-4" : "bottom-4")}>
          <ArtistCardMeta primaryGenre={isSpotlight ? undefined : primaryGenre} badgeLabel={isSpotlight ? "AI Persona" : "AI Persona Artist"} />
        </div>
        {isSpotlight && primaryGenre ? (
          <div className="absolute bottom-4 left-4 right-4">
            <ArtistCardMeta primaryGenre={primaryGenre} badgeLabel="" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-2xl font-semibold text-white">{displayName}</h3>
        {showBio ? <p className={cx("mt-2 text-sm leading-6 text-white/66", isSpotlight ? "line-clamp-3" : "line-clamp-3")}>{bio}</p> : null}
        {showTags ? <ArtistCardTags tags={cardTags} maxTags={maxTags} fallback={isSpotlight ? "signature sound forming" : undefined} /> : null}
        {showLatestRelease ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/46">Latest Release</p>
            <p className="mt-2 text-sm font-semibold text-cyan-100">{latestTitle}</p>
          </div>
        ) : null}
        <div className="mt-auto pt-5">
          <ArtistCardActions artist={artist} latestRelease={latest} showLatestRelease={false} onOpen={onOpen} />
        </div>
      </div>
    </Card>
  );
}

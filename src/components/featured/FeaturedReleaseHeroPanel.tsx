import type { FeaturedReleaseItem } from "../../models/homepage";
import { formatReleaseDate } from "../../utils/format";
import { CoverArtImage } from "../media/CoverArtImage";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { FeaturedReleaseActions } from "./FeaturedReleaseActions";
import { FeaturedReleaseBadge } from "./FeaturedReleaseBadge";

interface FeaturedReleaseHeroPanelProps {
  item: FeaturedReleaseItem;
}

export function FeaturedReleaseHeroPanel({ item }: FeaturedReleaseHeroPanelProps) {
  const { artist, release } = item;
  const releaseDate = formatReleaseDate(release.releaseDate);
  const tags = release.styleTags.slice(0, 4);
  const description =
    release.featuredDescription?.trim() ||
    artist.bio ||
    "A selected Ascend Nexus Media release from the public artist catalog.";

  return (
    <Card className="overflow-hidden border-white/12 bg-white/[0.055] p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="bg-black/18 p-5 sm:p-7 lg:p-8">
          <CoverArtImage
            src={release.promoImageUrl || release.coverArtUrl}
            title={release.title}
            artistName={artist.displayName}
            size="hero"
            priority
            fallbackVariant="default"
            aspectRatio="1:1"
            className="mx-auto max-w-md"
          />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <FeaturedReleaseBadge release={release} />
          <div className="mt-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyanGlow">{artist.displayName}</p>
            <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              {release.title}
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/62">
              {releaseDate ? <span>{releaseDate}</span> : null}
              {releaseDate && release.genre ? <span aria-hidden="true">/</span> : null}
              {release.genre ? <span>{release.genre}</span> : null}
            </div>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">{description}</p>
          </div>
          {tags.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="glass">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-8">
            <FeaturedReleaseActions release={release} artist={artist} />
          </div>
        </div>
      </div>
    </Card>
  );
}

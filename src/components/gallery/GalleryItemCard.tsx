import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useAnalytics } from "../../hooks/useAnalytics";
import type { PublicGalleryItem } from "../../models/gallery";
import { cx } from "../../utils/format";
import { ArtistProfileImage } from "../media/ArtistProfileImage";
import { CoverArtImage } from "../media/CoverArtImage";
import { Card } from "../ui/Card";
import { GalleryLightboxReadyWrapper } from "./GalleryLightboxReadyWrapper";
import { GalleryMediaBadge } from "./GalleryMediaBadge";

interface GalleryItemCardProps {
  item: PublicGalleryItem;
}

const getMetadataString = (item: PublicGalleryItem, key: string): string | undefined => {
  const value = item.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getDetailLink = (item: PublicGalleryItem): { to: string; label: string } | undefined => {
  const releaseSlug = getMetadataString(item, "releaseSlug");
  const artistSlug = getMetadataString(item, "artistSlug");

  if (item.mediaType === "cover_art" && releaseSlug) {
    return { to: `/songs/${releaseSlug}`, label: `Open ${item.title}` };
  }

  if (item.mediaType === "artist_profile" && artistSlug) {
    return { to: `/artists/${artistSlug}`, label: `View ${item.title}` };
  }

  return undefined;
};

function GalleryImage({ item }: GalleryItemCardProps) {
  const artistName = getMetadataString(item, "artistName") ?? item.title;
  const imageSrc = item.thumbnailUrl || item.imageUrl;

  if (item.mediaType === "artist_profile") {
    return (
      <ArtistProfileImage
        src={imageSrc}
        alt={item.altText}
        artistName={item.title}
        displayName={item.title}
        size="card"
        shape="rounded"
        aspectRatio="4:5"
      />
    );
  }

  return (
    <CoverArtImage
      src={imageSrc}
      alt={item.altText}
      title={item.title}
      artistName={artistName}
      size="card"
      aspectRatio={item.mediaType === "video_thumbnail" ? "16:9" : "1:1"}
    />
  );
}

function GalleryItemCardComponent({ item }: GalleryItemCardProps) {
  const analytics = useAnalytics();
  const detailLink = getDetailLink(item);
  const artistName = getMetadataString(item, "artistName");
  const genre = getMetadataString(item, "genre");

  return (
    <GalleryLightboxReadyWrapper galleryItemId={item.galleryItemId} title={item.title}>
      <Card
        as="article"
        interactive={Boolean(detailLink)}
        className="group h-full overflow-hidden border-white/12 bg-white/[0.055] p-0"
      >
        <div className="p-4">
          <GalleryImage item={item} />
        </div>
        <div className="space-y-4 px-5 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <GalleryMediaBadge mediaType={item.mediaType} />
            {genre ? <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">{genre}</span> : null}
          </div>
          <div>
            <h2 className="text-xl font-semibold leading-tight text-white">{item.title}</h2>
            {artistName ? <p className="mt-2 text-sm font-medium text-cyanGlow">{artistName}</p> : null}
            {item.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">{item.description}</p> : null}
          </div>
          {detailLink ? (
            <Link
              to={detailLink.to}
              aria-label={detailLink.label}
              onClick={() => {
                void analytics.trackGalleryView(item);
              }}
              className={cx(
                "anm-focus inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-white/78",
                "transition duration-300 ease-anm-out hover:border-anm-pink/45 hover:bg-white/10 hover:text-white",
              )}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View Details
            </Link>
          ) : null}
        </div>
      </Card>
    </GalleryLightboxReadyWrapper>
  );
}

export const GalleryItemCard = memo(GalleryItemCardComponent);

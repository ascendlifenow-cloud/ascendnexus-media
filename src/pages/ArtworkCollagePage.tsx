import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PublicLoadingErrorState } from "../components/fallback";
import { GridSkeleton } from "../components/loading";
import { SEOHead } from "../components/SEOHead";
import type { GalleryMediaType } from "../models/gallery";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";
import { isSafePublicMediaUrl } from "../utils/media/publicSafeUrlUtils";

interface PublicArtworkCollageItem {
  id: string;
  title: string;
  label: string;
  imageUrl: string;
  altText: string;
  type: GalleryMediaType | "release_cover" | "artist_profile";
}

const artworkCollageMetadata = {
  title: "Artwork Collage | Ascend Nexus Media",
  description: "A full-screen randomized collage of public Ascend Nexus Media artwork, cover art, profile art, character art, and gallery visuals.",
  canonicalPath: "/artwork",
  type: "custom" as const,
};

const unsafePublicPathPattern = /(^|\/)(private|admin-only|protected|full-song|source-master)(\/|$)|private\/media-library/i;

const isCollageSafeImageUrl = (url: string | null | undefined): url is string => {
  const value = url?.trim() ?? "";
  return Boolean(value) && isSafePublicMediaUrl(value) && !unsafePublicPathPattern.test(value);
};

const seededValue = (value: string, seed: number): number => {
  let hash = Math.floor(seed * 1_000_000_000);
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(Math.sin(hash) * 10_000) % 1;
};

const tileMarginClasses = ["mb-2", "mb-4", "mb-5", "mb-7"];
const tileLiftClasses = ["", "translate-y-1", "-translate-y-1", "translate-y-2"];

const getTileTone = (type: PublicArtworkCollageItem["type"]): string => {
  if (type === "release_cover" || type === "cover_art") return "from-anm-cyan/22 via-white/[0.04] to-anm-pink/18";
  if (type === "artist_profile") return "from-anm-pink/22 via-white/[0.04] to-anm-cyan/14";
  if (type === "promo_graphic") return "from-anm-purple/24 via-white/[0.04] to-anm-gold/16";
  return "from-emerald-400/18 via-white/[0.04] to-anm-purple/16";
};

const toPublicArtworkItems = async (): Promise<PublicArtworkCollageItem[]> => {
  const [artists, releases, gallery] = await Promise.all([
    publicMediaApiClient.listArtists(),
    publicMediaApiClient.listReleases(),
    publicMediaApiClient.listGallery(),
  ]);

  const items: PublicArtworkCollageItem[] = [];
  const seen = new Set<string>();

  const addItem = (item: PublicArtworkCollageItem) => {
    const key = `${item.imageUrl}:${item.id}`;
    if (seen.has(key) || !isCollageSafeImageUrl(item.imageUrl)) return;
    seen.add(key);
    items.push(item);
  };

  artists.forEach((artist) => {
    if (!isCollageSafeImageUrl(artist.profileImage)) return;
    addItem({
      id: `artist:${artist.artistId}`,
      title: artist.displayName,
      label: "Artist Profile Art",
      imageUrl: artist.profileImage,
      altText: `${artist.displayName} profile artwork`,
      type: "artist_profile",
    });
  });

  releases.forEach((release) => {
    if (!isCollageSafeImageUrl(release.coverArtUrl)) return;
    addItem({
      id: `release:${release.releaseId}`,
      title: release.title,
      label: "Album Cover Art",
      imageUrl: release.coverArtUrl,
      altText: `${release.title} cover art`,
      type: "release_cover",
    });
    if (isCollageSafeImageUrl(release.promoImageUrl)) {
      addItem({
        id: `release-promo:${release.releaseId}`,
        title: release.title,
        label: "Promotional Art",
        imageUrl: release.promoImageUrl,
        altText: `${release.title} promotional artwork`,
        type: "promo_graphic",
      });
    }
  });

  gallery.forEach((item) => {
    const imageUrl = item.imageUrl || item.thumbnailUrl;
    if (!isCollageSafeImageUrl(imageUrl)) return;
    addItem({
      id: `gallery:${item.galleryItemId}`,
      title: item.title,
      label: item.mediaType.replace(/_/g, " "),
      imageUrl,
      altText: item.altText || item.title,
      type: item.mediaType,
    });
  });

  return items;
};

function ArtworkCollageTile({ item, priority = false, layoutSeed }: { item: PublicArtworkCollageItem; priority?: boolean; layoutSeed: number }) {
  const [failed, setFailed] = useState(false);
  const layoutValue = seededValue(item.id, layoutSeed);
  const marginClass = tileMarginClasses[Math.floor(layoutValue * tileMarginClasses.length)] ?? "mb-4";
  const liftClass = tileLiftClasses[Math.floor(seededValue(`${item.id}:lift`, layoutSeed) * tileLiftClasses.length)] ?? "";

  return (
    <article className={`group break-inside-avoid overflow-hidden rounded-md border border-white/10 bg-[#130f18]/92 shadow-[0_18px_55px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-1 hover:border-anm-cyan/45 hover:shadow-[0_24px_80px_rgba(39,245,255,0.12)] motion-reduce:transform-none ${marginClass} ${liftClass}`}>
      <div className={`relative min-h-52 bg-gradient-to-br ${getTileTone(item.type)}`}>
        {!failed ? (
          <img
            src={item.imageUrl}
            alt={item.altText}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-auto w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-5 text-center">
            <ImageOff className="h-8 w-8 text-white/38" aria-hidden />
            <p className="max-w-56 text-sm font-semibold text-white/72">{item.title || "Artwork preview unavailable"}</p>
            <p className="text-xs text-white/42">Preview could not be loaded.</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/28 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs capitalize text-white/68">{item.label}</p>
        </div>
      </div>
    </article>
  );
}

export function ArtworkCollagePage() {
  const navigate = useNavigate();
  const [layoutSeed] = useState(() => Math.random());
  const artworkQuery = useQuery({
    queryKey: ["public-api", "artwork-collage"],
    queryFn: toPublicArtworkItems,
    staleTime: 10 * 60 * 1000,
  });

  const artworkItems = useMemo(
    () =>
      [...(artworkQuery.data ?? [])].sort((left, right) => {
        const leftRandom = seededValue(left.id, layoutSeed);
        const rightRandom = seededValue(right.id, layoutSeed);
        return leftRandom - rightRandom;
      }),
    [artworkQuery.data, layoutSeed],
  );

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#07050a] text-white">
      <SEOHead metadata={artworkCollageMetadata} />

      <div className="min-h-screen px-2 py-2 sm:px-3 sm:py-3">
        {artworkQuery.isLoading ? <GridSkeleton itemCount={16} variant="block" columns="sm:grid-cols-2 xl:grid-cols-5" /> : null}
        {artworkQuery.isError ? <div className="flex min-h-screen items-center justify-center"><PublicLoadingErrorState /></div> : null}

        {!artworkQuery.isLoading && !artworkQuery.isError && artworkItems.length ? (
          <main aria-label="Full screen artwork collage" className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
            {artworkItems.map((item, index) => (
              <ArtworkCollageTile key={item.id} item={item} priority={index < 8} layoutSeed={layoutSeed} />
            ))}
          </main>
        ) : null}

        {!artworkQuery.isLoading && !artworkQuery.isError && !artworkItems.length ? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
            <ImageOff className="h-10 w-10 text-white/38" aria-hidden />
            <p className="text-lg font-semibold text-white">No public artwork found.</p>
            <p className="max-w-xl text-sm text-white/58">Publish artists, releases, or gallery images with public-safe artwork and they will appear here automatically.</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={goBack}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/78 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-anm-cyan/55 hover:bg-anm-cyan/16 focus:outline-none focus:ring-2 focus:ring-anm-cyan/70 motion-reduce:transform-none"
        aria-label="Back to public site"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>
    </div>
  );
}

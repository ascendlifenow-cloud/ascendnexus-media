import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { useAdminMediaAssets } from "../../hooks/admin/useAdminContent";
import type { MediaAssetRecord, MediaAssetType } from "../../models/admin";
import { adminMediaService } from "../../services/admin";
import { formatMediaAssetType, getMediaAssetPreviewType } from "../utils/adminMediaUtils";

const adminArtworkCollageMetadata = {
  title: "Artwork Collage | Ascend Nexus Media Admin",
  description: "Scrollable overview collage of Ascend Nexus Media artwork assets.",
  type: "custom" as const,
  noIndex: true,
};

const artworkTypes: MediaAssetType[] = [
  "cover_art",
  "artist_profile",
  "artist_character_art",
  "artist_banner",
  "promo_graphic",
  "gallery_image",
  "video_thumbnail",
  "social_preview",
  "logo",
  "fallback_image",
  "custom_image",
];

const getTileTone = (assetType: MediaAssetType): string => {
  if (assetType === "cover_art") return "from-anm-cyan/22 via-white/[0.04] to-anm-pink/18";
  if (assetType === "artist_character_art") return "from-anm-purple/24 via-white/[0.04] to-anm-gold/16";
  if (assetType === "artist_profile") return "from-anm-pink/22 via-white/[0.04] to-anm-cyan/14";
  if (assetType === "gallery_image") return "from-emerald-400/18 via-white/[0.04] to-anm-purple/16";
  return "from-white/[0.08] via-white/[0.035] to-anm-cyan/12";
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

function ArtworkCollageTile({ asset, priority = false, layoutSeed }: { asset: MediaAssetRecord; priority?: boolean; layoutSeed: number }) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setPreviewUrl(undefined);
    setFailed(false);
    void adminMediaService.getMediaAssetPreviewUrl(asset).then((result) => {
      if (!active) return;
      if (result.ok) setPreviewUrl(result.data);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [asset]);

  const assetLabel = formatMediaAssetType(asset.assetType);
  const layoutValue = seededValue(asset.assetId, layoutSeed);
  const marginClass = tileMarginClasses[Math.floor(layoutValue * tileMarginClasses.length)] ?? "mb-4";
  const liftClass = tileLiftClasses[Math.floor(seededValue(`${asset.assetId}:lift`, layoutSeed) * tileLiftClasses.length)] ?? "";

  return (
    <article className={`group break-inside-avoid overflow-hidden rounded-md border border-white/10 bg-[#130f18]/92 shadow-[0_18px_55px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-1 hover:border-anm-cyan/45 hover:shadow-[0_24px_80px_rgba(39,245,255,0.12)] motion-reduce:transform-none ${marginClass} ${liftClass}`}>
      <div className={`relative min-h-52 bg-gradient-to-br ${getTileTone(asset.assetType)}`}>
        {previewUrl && !failed ? (
          <img
            src={previewUrl}
            alt={asset.altText || asset.title || assetLabel}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-auto w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-5 text-center">
            <ImageOff className="h-8 w-8 text-white/38" aria-hidden />
            <p className="max-w-56 text-sm font-semibold text-white/72">{asset.title || "Artwork preview unavailable"}</p>
            <p className="text-xs text-white/42">{failed ? "Preview could not be resolved." : "Loading artwork preview."}</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/28 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
          <p className="truncate text-sm font-semibold text-white">{asset.title || "Untitled artwork"}</p>
          <p className="mt-1 text-xs text-white/68">{assetLabel}</p>
        </div>
      </div>
    </article>
  );
}

export function AdminArtworkCollagePage() {
  const navigate = useNavigate();
  const [layoutSeed] = useState(() => Math.random());
  const mediaQuery = useAdminMediaAssets();
  const assets = mediaQuery.data?.ok ? mediaQuery.data.data : [];
  const artworkAssets = useMemo(
    () =>
      assets
        .filter((asset) => artworkTypes.includes(asset.assetType) || getMediaAssetPreviewType(asset) === "image")
        .sort((left, right) => {
          const leftRandom = seededValue(left.assetId, layoutSeed);
          const rightRandom = seededValue(right.assetId, layoutSeed);
          return leftRandom - rightRandom;
        }),
    [assets, layoutSeed],
  );

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate("/admin/dashboard");
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#07050a] text-white">
      <SEOHead metadata={adminArtworkCollageMetadata} disableSocial />

      <div className="min-h-screen px-2 py-2 sm:px-3 sm:py-3">
        {mediaQuery.isLoading ? <GridSkeleton itemCount={16} variant="block" columns="sm:grid-cols-2 xl:grid-cols-5" /> : null}
        {mediaQuery.isError || mediaQuery.data?.ok === false ? <div className="flex min-h-screen items-center justify-center"><PublicLoadingErrorState /></div> : null}

        {!mediaQuery.isLoading && mediaQuery.data?.ok && artworkAssets.length ? (
          <main aria-label="Full screen artwork collage" className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
            {artworkAssets.map((asset, index) => (
              <ArtworkCollageTile key={asset.assetId} asset={asset} priority={index < 8} layoutSeed={layoutSeed} />
            ))}
          </main>
        ) : null}

        {!mediaQuery.isLoading && mediaQuery.data?.ok && !artworkAssets.length ? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
            <ImageOff className="h-10 w-10 text-white/38" aria-hidden />
            <p className="text-lg font-semibold text-white">No artwork assets found.</p>
            <p className="max-w-xl text-sm text-white/58">Upload cover art, character art, profile images, gallery art, or custom images and they will appear here automatically.</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={goBack}
        className="fixed bottom-5 right-5 z-[101] inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/78 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-anm-cyan/55 hover:bg-anm-cyan/16 focus:outline-none focus:ring-2 focus:ring-anm-cyan/70 motion-reduce:transform-none"
        aria-label="Back to admin"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>
    </div>
  );
}

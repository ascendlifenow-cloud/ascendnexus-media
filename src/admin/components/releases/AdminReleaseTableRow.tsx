import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import { CoverArtImage } from "../../../components/media/CoverArtImage";
import { Badge } from "../../../components/ui/Badge";
import { buildReleasePublishReadiness, formatReleaseReadinessStatus } from "../../../utils/admin/releasePublishingUtils";
import { AdminReleaseFeaturedBadge } from "./AdminReleaseFeaturedBadge";
import { AdminReleasePublicLinkState } from "./AdminReleasePublicLinkState";
import { AdminReleaseStatusBadge } from "./AdminReleaseStatusBadge";
import { getFormattedReleaseDate, getReleaseMissingDataLabels } from "../../utils/adminReleaseUtils";

interface AdminReleaseTableRowProps {
  release: SongReleaseAdminRecord;
  artist: ArtistAdminRecord | null;
  selected: boolean;
  onSelect: (release: SongReleaseAdminRecord) => void;
  onOpenDetails: (release: SongReleaseAdminRecord) => void;
  onReleaseUpdated?: (release: SongReleaseAdminRecord) => void;
  onReleaseDeleted?: (releaseId: string) => void;
}

export function AdminReleaseTableRow({ release, artist, selected, onSelect, onOpenDetails }: AdminReleaseTableRowProps) {
  const missingLabels = getReleaseMissingDataLabels(release, artist);
  const description = release.description || release.featuredDescription || "No release description has been added yet.";
  const readiness = buildReleasePublishReadiness(release, artist, []);
  const readinessLabel = release.status === "published" ? "Published" : formatReleaseReadinessStatus(readiness);

  return (
    <tr
      className={[
        "cursor-pointer align-top transition duration-200 ease-out focus:outline-none",
        selected
          ? "-translate-y-1 bg-anm-pink/10 shadow-[0_20px_46px_rgba(255,58,166,0.16)] ring-1 ring-anm-pink/35"
          : "bg-anm-surface-glass hover:-translate-y-0.5 hover:bg-white/[0.055]",
      ].join(" ")}
      aria-label={`${release.title || "Untitled Release"} release row`}
      aria-current={selected ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(release)}
      onDoubleClick={() => onOpenDetails(release)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(release);
      }}
    >
      <td className={`min-w-[24rem] rounded-l-md border-y px-4 py-4 ${selected ? "border-anm-pink/40 border-l bg-anm-pink/[0.045]" : "border-white/10 border-l"}`}>
        <div className="flex gap-3">
          <CoverArtImage
            src={release.coverArtThumbnailUrl || release.coverArtUrl}
            title={release.title}
            artistName={artist?.displayName}
            size="thumbnail"
            fallbackVariant="minimal"
            className="h-16 w-16 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-white">{release.title || "Untitled Release"}</p>
            <p className="mt-1 text-sm text-white/48">{release.slug || "Missing slug"}</p>
            <p className="mt-1 line-clamp-2 max-w-md text-sm leading-6 text-white/56">{description}</p>
            {missingLabels.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {missingLabels.slice(0, 5).map((label) => (
                  <Badge key={label} variant="neutral" className="px-2 py-1 text-[0.68rem]">
                    Missing {label}
                  </Badge>
                ))}
                {missingLabels.length > 5 ? (
                  <Badge variant="neutral" className="px-2 py-1 text-[0.68rem]">
                    +{missingLabels.length - 5}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className={`min-w-52 border-y px-4 py-4 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>
        <p className="text-sm font-semibold text-white">{artist?.displayName ?? "Missing artist"}</p>
        {artist && artist.status !== "active" ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-anm-gold">{artist.status}</p>
        ) : null}
      </td>
      <td className={`border-y px-4 py-4 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>
        <AdminReleaseStatusBadge status={release.status} />
        <div className="mt-2">
          <Badge variant={readiness.ready ? "sunrise" : "neutral"} className="px-2 py-1 text-[0.68rem]">
            {readinessLabel}
          </Badge>
        </div>
      </td>
      <td className={`min-w-44 border-y px-4 py-4 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>
        <AdminReleaseFeaturedBadge release={release} />
      </td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>
        <p>{release.genre || "Missing genre"}</p>
        <p className="mt-1 text-xs text-white/42">{release.styleTags?.slice(0, 2).join(", ") || "No tags"}</p>
      </td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>{getFormattedReleaseDate(release.releaseDate)}</td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>{getFormattedReleaseDate(release.updatedAt)}</td>
      <td className={`rounded-r-md border-y px-4 py-4 ${selected ? "border-anm-pink/40 border-r bg-anm-pink/[0.045]" : "border-white/10 border-r"}`}>
        <AdminReleasePublicLinkState release={release} artist={artist} />
      </td>
    </tr>
  );
}

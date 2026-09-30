import type { ArtistAdminRecord } from "../../../models/admin";
import { ArtistAvatar } from "../../../components/media/ArtistAvatar";
import { Badge } from "../../../components/ui/Badge";
import { buildArtistPublishReadiness, formatArtistReadinessStatus } from "../../../utils/admin/artistPublishingUtils";
import { AdminArtistStatusBadge } from "./AdminArtistStatusBadge";
import { PublicVisibilityBadge } from "../publishing";
import {
  getArtistMissingDataLabels,
  getArtistPublicVisibilityState,
  getFormattedAdminDate,
} from "../../utils/adminArtistUtils";

interface AdminArtistTableRowProps {
  artist: ArtistAdminRecord;
  selected: boolean;
  onSelect: (artist: ArtistAdminRecord) => void;
  onOpenDetails: (artist: ArtistAdminRecord) => void;
}

export function AdminArtistTableRow({ artist, selected, onSelect, onOpenDetails }: AdminArtistTableRowProps) {
  const missingLabels = getArtistMissingDataLabels(artist);
  const isPublic = getArtistPublicVisibilityState(artist) === "public";
  const shortBio = artist.shortBio || artist.bio || "No bio has been added yet.";
  const readiness = buildArtistPublishReadiness(artist, []);
  const readinessLabel = artist.status === "active" ? "Active" : artist.status === "archived" ? "Archived" : formatArtistReadinessStatus(readiness);

  return (
    <tr
      className={[
        "cursor-pointer align-top transition duration-200 ease-out focus:outline-none",
        selected
          ? "-translate-y-1 bg-anm-pink/10 shadow-[0_20px_46px_rgba(255,58,166,0.16)] ring-1 ring-anm-pink/35"
          : "bg-anm-surface-glass hover:-translate-y-0.5 hover:bg-white/[0.055]",
      ].join(" ")}
      aria-label={`${artist.displayName || artist.name || "Untitled Artist"} artist row`}
      aria-current={selected ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(artist)}
      onDoubleClick={() => onOpenDetails(artist)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(artist);
      }}
    >
      <td className={`min-w-72 rounded-l-md border-y px-4 py-4 ${selected ? "border-anm-pink/40 border-l bg-anm-pink/[0.045]" : "border-white/10 border-l"}`}>
        <div className="flex gap-3">
          <ArtistAvatar src={artist.profileImage} artistName={artist.name} displayName={artist.displayName} />
          <div className="min-w-0">
            <p className="font-semibold text-white">{artist.displayName || artist.name || "Untitled Artist"}</p>
            <p className="mt-1 line-clamp-2 max-w-md text-sm leading-6 text-white/56">{shortBio}</p>
            {missingLabels.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {missingLabels.map((label) => (
                  <Badge key={label} variant="neutral" className="px-2 py-1 text-[0.68rem]">
                    Missing {label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>{artist.slug || "Missing slug"}</td>
      <td className={`border-y px-4 py-4 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>
        <AdminArtistStatusBadge status={artist.status} />
        <div className="mt-2">
          <Badge variant={readiness.ready ? "sunrise" : "neutral"} className="px-2 py-1 text-[0.68rem]">
            {readinessLabel}
          </Badge>
        </div>
      </td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>{artist.sortOrder}</td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>{artist.featured ? "Yes" : "No"}</td>
      <td className={`border-y px-4 py-4 text-sm text-white/64 ${selected ? "border-anm-pink/40 bg-anm-pink/[0.045]" : "border-white/10"}`}>{getFormattedAdminDate(artist.updatedAt)}</td>
      <td className={`rounded-r-md border-y px-4 py-4 text-sm font-semibold ${selected ? "border-anm-pink/40 border-r bg-anm-pink/[0.045]" : "border-white/10 border-r"}`}>
        <PublicVisibilityBadge visibility={isPublic ? "public" : "not_public"} />
      </td>
    </tr>
  );
}

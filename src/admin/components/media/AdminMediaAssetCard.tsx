import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaAssetAssignmentState } from "../../../models/media";
import { Badge } from "../../../components/ui/Badge";
import { AdminMediaPreviewFrame } from "./AdminMediaPreviewFrame";
import { AdminMediaStatusBadge } from "./AdminMediaStatusBadge";
import { AdminMediaTypeBadge } from "./AdminMediaTypeBadge";
import {
  formatMediaOwnerType,
  getFormattedMediaDate,
  getMediaAssetMissingDataLabels,
  getMediaAssetPublicVisibilityState,
} from "../../utils/adminMediaUtils";
import { PublicVisibilityBadge } from "../publishing";
import { MediaAssetAssignmentBadge } from "../media-links";
import { mediaAssetLinkingService, mediaAssetVisibilityService } from "../../../services/media";
import { MediaAssetVisibilityBadge } from "./MediaAssetVisibilityBadge";

interface AdminMediaAssetCardProps {
  asset: MediaAssetRecord;
  assignmentState?: MediaAssetAssignmentState;
  selected: boolean;
  onSelect: (asset: MediaAssetRecord) => void;
  onOpenDetails: (asset: MediaAssetRecord) => void;
}

const getProcessingStatus = (asset: MediaAssetRecord): string | undefined => {
  const processing = asset.metadata?.processing;
  if (!processing || typeof processing !== "object" || Array.isArray(processing)) return undefined;
  const status = processing.status;
  return typeof status === "string" ? status : undefined;
};

const getLinkAssignmentState = (assetId: string): MediaAssetAssignmentState => {
  const activeLinkCount = mediaAssetLinkingService.getAssetLinks(assetId).filter((link) => link.status === "active").length;
  if (activeLinkCount > 1) return "multi_assigned";
  if (activeLinkCount === 1) return "assigned";
  return "unassigned";
};

export function AdminMediaAssetCard({ asset, assignmentState: assignmentStateOverride, selected, onSelect, onOpenDetails }: AdminMediaAssetCardProps) {
  const missingLabels = getMediaAssetMissingDataLabels(asset);
  const visibility = getMediaAssetPublicVisibilityState(asset);
  const processingStatus = getProcessingStatus(asset);
  const assignmentState = assignmentStateOverride ?? getLinkAssignmentState(asset.assetId);
  const visibilityState = mediaAssetVisibilityService.getAssetVisibility(asset);

  return (
    <article
      className={[
        "grid cursor-pointer gap-3 rounded-md border p-3 shadow-anm-card-glow transition duration-200 ease-out hover:-translate-y-0.5 hover:border-anm-pink/30 hover:bg-white/[0.055]",
        "focus:outline-none focus:ring-2 focus:ring-anm-electric/45",
        "md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[5rem_minmax(0,1.6fr)_minmax(12rem,0.75fr)_minmax(12rem,0.65fr)] lg:items-center",
        selected
          ? "-translate-y-1 border-anm-pink/70 bg-anm-pink/10 shadow-[0_22px_52px_rgba(255,58,166,0.18)] ring-1 ring-anm-pink/35"
          : "border-white/10 bg-anm-surface-glass",
      ].join(" ")}
      aria-label={`${asset.title} media asset`}
      aria-current={selected ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(asset)}
      onDoubleClick={() => onOpenDetails(asset)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(asset);
      }}
    >
      <div className="row-span-1">
        <AdminMediaPreviewFrame asset={asset} compact />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <AdminMediaTypeBadge assetType={asset.assetType} />
          {processingStatus ? (
            <Badge variant={processingStatus === "completed" ? "sunrise" : processingStatus === "failed" ? "pink" : "neutral"} className="px-2 py-1 text-[0.66rem]">
              Processing {processingStatus}
            </Badge>
          ) : null}
        </div>
        <h2 className="mt-2 truncate text-base font-semibold text-white">{asset.title || "Untitled Media Asset"}</h2>
        <p className="mt-1 truncate text-sm text-white/50">{asset.description || asset.assetId}</p>
        {missingLabels.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {missingLabels.slice(0, 2).map((label) => (
              <Badge key={label} variant="neutral" className="px-2 py-1 text-[0.66rem]">
                Missing {label}
              </Badge>
            ))}
            {missingLabels.length > 2 ? (
              <Badge variant="neutral" className="px-2 py-1 text-[0.66rem]">
                +{missingLabels.length - 2}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:col-start-2 lg:col-start-auto">
        <AdminMediaStatusBadge status={asset.status} />
        <MediaAssetAssignmentBadge state={assignmentState} />
        <MediaAssetVisibilityBadge visibility={visibilityState.visibility} />
        <PublicVisibilityBadge visibility={visibility === "public" ? "public" : "not_public"} />
      </div>

      <dl className="grid gap-2 text-sm text-white/62 sm:grid-cols-2 md:col-start-2 lg:col-start-auto lg:grid-cols-1">
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/38">Owner</dt>
          <dd className="mt-1 truncate font-semibold text-white/72">{formatMediaOwnerType(asset.ownerType)}</dd>
          <dd className="truncate text-xs text-white/42">{asset.ownerId || "Missing"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/38">Updated</dt>
          <dd className="mt-1 text-white/72">{getFormattedMediaDate(asset.updatedAt || asset.createdAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

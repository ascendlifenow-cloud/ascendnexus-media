import { X } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";
import { AdminMediaPreviewFrame } from "./AdminMediaPreviewFrame";
import { AdminMediaStatusBadge } from "./AdminMediaStatusBadge";
import { AdminMediaTypeBadge } from "./AdminMediaTypeBadge";
import { AdminMediaUploadAssignmentStatus } from "./AdminMediaUploadAssignmentStatus";
import { MediaDeletionReadinessPanel } from "./MediaDeletionReadinessPanel";
import { MediaDependencyWarningPanel } from "./MediaDependencyWarningPanel";
import { MediaLifecycleActionButtons } from "./MediaLifecycleActionButtons";
import { MediaVersionHistoryPanel } from "./MediaVersionHistoryPanel";
import { MediaPublicationStatusPanel } from "../publication";
import { mediaAssetLinkingService, mediaAssetVersionService } from "../../../services/media";
import { getMediaAssetDependencies } from "../../../utils/media/mediaDependencyUtils";
import { buildMediaDeletionReadiness, formatMediaLifecycleStatus } from "../../../utils/media/mediaLifecycleUtils";
import {
  formatMediaOwnerType,
  getFormattedMediaDate,
  getMediaAssetMissingDataLabels,
} from "../../utils/adminMediaUtils";

interface AdminMediaAssetPreviewProps {
  asset: MediaAssetRecord | null;
  onClose: () => void;
  onAssetUpdated?: (asset: MediaAssetRecord) => void;
}

export function AdminMediaAssetPreview({ asset, onClose, onAssetUpdated }: AdminMediaAssetPreviewProps) {
  if (!asset) return null;

  const missingLabels = getMediaAssetMissingDataLabels(asset);
  const dependencies = getMediaAssetDependencies(asset, mediaAssetLinkingService.getAssetLinks(asset.assetId));
  const activeVersionCount = mediaAssetVersionService.listVersions(asset.assetId).filter((version) => version.status === "active").length;
  const actionType = asset.status === "archived" ? "restore" : "archive";
  const readiness = buildMediaDeletionReadiness(asset, actionType, dependencies, undefined, activeVersionCount);
  const deleteReadiness = buildMediaDeletionReadiness(asset, "soft_delete", dependencies, undefined, activeVersionCount);
  const versionHistory = mediaAssetVersionService.getVersionHistory(asset.assetId);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="asset-detail-title">
      <div className="mx-auto flex max-h-[calc(100vh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-md border border-white/12 bg-anm-bg shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyanGlow">Media Asset Details</p>
            <h2 id="asset-detail-title" className="mt-2 text-xl font-semibold text-white">{asset.title || "Untitled Media Asset"}</h2>
            <p className="mt-1 text-sm text-white/52">Full asset information, lifecycle state, storage metadata, dependencies, and processing readiness.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close asset details">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(18rem,26rem)_1fr]">
            <AdminMediaPreviewFrame asset={asset} />
            <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <AdminMediaTypeBadge assetType={asset.assetType} />
                <AdminMediaStatusBadge status={asset.status} />
              </div>
              <div className="mt-3">
                <AdminMediaUploadAssignmentStatus asset={asset} />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/42">Lifecycle: {formatMediaLifecycleStatus(asset)}</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{asset.title || "Untitled Media Asset"}</h3>
              <p className="mt-2 text-sm leading-6 text-white/58">{asset.description || "No description has been added yet."}</p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Asset ID</dt>
              <dd className="mt-1 break-all text-white/76">{asset.assetId}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Owner</dt>
              <dd className="mt-1 text-white/76">{formatMediaOwnerType(asset.ownerType)} / {asset.ownerId || "Missing"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">URL</dt>
              <dd className="mt-1 break-all text-white/76">{asset.url || "Missing URL"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Thumbnail URL</dt>
              <dd className="mt-1 break-all text-white/76">{asset.thumbnailUrl || "Missing thumbnail"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Alt Text</dt>
              <dd className="mt-1 text-white/76">{asset.altText || "Missing alt text"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Credit</dt>
              <dd className="mt-1 text-white/76">{asset.credit || "Missing credit"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Created</dt>
              <dd className="mt-1 text-white/76">{getFormattedMediaDate(asset.createdAt)}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Updated</dt>
              <dd className="mt-1 text-white/76">{getFormattedMediaDate(asset.updatedAt)}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Storage Object</dt>
              <dd className="mt-1 break-all text-white/76">
                {typeof asset.metadata?.storage === "object" && asset.metadata.storage && !Array.isArray(asset.metadata.storage) && "storageObjectId" in asset.metadata.storage
                  ? String(asset.metadata.storage.storageObjectId)
                  : "Storage metadata pending"}
              </dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Actions</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="glass" size="sm" disabled>Copy URL</Button>
                <Button type="button" variant="ghost" size="sm" disabled>Assign Asset</Button>
                <LinkButton to={`/admin/media/processing?assetId=${asset.assetId}`} variant="ghost" size="sm">
                  Processing Details
                </LinkButton>
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-4">
            <MediaLifecycleActionButtons asset={asset} onAssetUpdated={onAssetUpdated} />
            <MediaDeletionReadinessPanel readiness={readiness} />
            {deleteReadiness.warnings.length || deleteReadiness.blockingDependencies.length ? (
              <MediaDeletionReadinessPanel readiness={deleteReadiness} />
            ) : null}
            <MediaDependencyWarningPanel dependencies={dependencies} />
            <MediaPublicationStatusPanel entityType="media_asset" entityId={asset.assetId} title="Media Publication Delivery" />
            {versionHistory ? <MediaVersionHistoryPanel history={versionHistory} /> : null}
          </div>

          <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Metadata Preview</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/64">
              {JSON.stringify(asset.metadata ?? { missingData: missingLabels }, null, 2)}
            </pre>
          </div>
            </div>
        </div>
      </div>
      </div>
    </div>
  );
}

import type { MediaPublicationReadiness } from "../../../models/publication";
import { AdminSectionCard } from "../AdminSectionCard";
import { MediaPublicationAssetList } from "./MediaPublicationAssetList";
import { MediaPublicationBlockingIssues } from "./MediaPublicationBlockingIssues";
import { MediaPublicationWarnings } from "./MediaPublicationWarnings";

export function MediaPublicationReadinessPanel({ readiness, loading }: { readiness?: MediaPublicationReadiness; loading?: boolean }) {
  return (
    <AdminSectionCard title="Publication Readiness" description="Required media, processing, storage, public mapping, and private-only checks.">
      {loading ? <p className="text-sm text-white/60">Checking publication readiness...</p> : null}
      {!loading && readiness ? (
        <div className="grid gap-4">
          <div className="grid gap-3 text-sm text-white/70 md:grid-cols-4">
            <div>Ready <span className="text-white">{readiness.ready ? "Yes" : "No"}</span></div>
            <div>Processing <span className="text-white">{readiness.processingReady ? "Ready" : "Pending"}</span></div>
            <div>Storage <span className="text-white">{readiness.storageReady ? "Ready" : "Pending"}</span></div>
            <div>Public Mapping <span className="text-white">{readiness.publicMappingReady ? "Ready" : "Pending"}</span></div>
          </div>
          <MediaPublicationBlockingIssues issues={readiness.blockingIssues} />
          <MediaPublicationWarnings warnings={readiness.warnings} />
          <div className="grid gap-3 lg:grid-cols-2">
            <MediaPublicationAssetList title="Required Assets" assets={readiness.requiredAssets} />
            <MediaPublicationAssetList title="Optional Assets" assets={readiness.optionalAssets} />
            <MediaPublicationAssetList title="Private Only" assets={readiness.privateOnlyAssets} />
            <MediaPublicationAssetList title="Blocked or Missing" assets={[...readiness.blockedAssets, ...readiness.missingAssets]} />
          </div>
        </div>
      ) : !loading ? (
        <p className="text-sm text-white/60">Select an entity to inspect publication readiness.</p>
      ) : null}
    </AdminSectionCard>
  );
}

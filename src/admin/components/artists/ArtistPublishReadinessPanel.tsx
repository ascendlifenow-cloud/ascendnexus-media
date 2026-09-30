import type { ArtistPublishReadiness } from "../../../models/admin";
import type { ArtistPublicProfile } from "../../../models/artist";
import { Badge } from "../../../components/ui/Badge";
import { formatArtistReadinessStatus } from "../../../utils/admin/artistPublishingUtils";
import { ArtistLinkedAssetReadinessList } from "./ArtistLinkedAssetReadinessList";
import { ArtistPublishBlockingIssuesList } from "./ArtistPublishBlockingIssuesList";
import { ArtistPublishWarningsList } from "./ArtistPublishWarningsList";
import { ArtistPublicMappingPreview } from "./ArtistPublicMappingPreview";

interface ArtistPublishReadinessPanelProps {
  readiness: ArtistPublishReadiness;
  publicPreview?: ArtistPublicProfile | null;
  compact?: boolean;
}

export function ArtistPublishReadinessPanel({ readiness, publicPreview, compact = false }: ArtistPublishReadinessPanelProps) {
  return (
    <section className="rounded-anm-card border border-white/10 bg-black/18 p-4" aria-label="Artist publish readiness">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Artist Publish Readiness</h3>
          <p className="mt-1 text-sm text-white/52">{formatArtistReadinessStatus(readiness)}</p>
        </div>
        <Badge variant={readiness.ready ? "sunrise" : "pink"}>{readiness.ready ? "Ready" : "Blocked"}</Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-white/62 sm:grid-cols-3">
        <div><dt className="text-white/42">Missing</dt><dd className="font-semibold text-white/76">{readiness.missingFields.length}</dd></div>
        <div><dt className="text-white/42">Blocking</dt><dd className="font-semibold text-white/76">{readiness.blockingIssues.length}</dd></div>
        <div><dt className="text-white/42">Warnings</dt><dd className="font-semibold text-white/76">{readiness.warnings.length}</dd></div>
      </dl>
      {readiness.missingFields.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {readiness.missingFields.map((field, index) => <Badge key={`${field}-${index}`} variant="neutral" className="px-2 py-1 text-[0.68rem]">Missing {field}</Badge>)}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3">
        <ArtistLinkedAssetReadinessList states={Object.values(readiness.linkedAssetStates)} />
        <ArtistPublishBlockingIssuesList issues={readiness.blockingIssues} />
        {!compact ? <ArtistPublishWarningsList warnings={readiness.warnings} /> : null}
        {!compact ? <ArtistPublicMappingPreview publicArtist={publicPreview ?? null} /> : null}
      </div>
    </section>
  );
}

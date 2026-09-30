import type { MediaAssetProcessingSummary } from "../../../../models/media";
import { Badge } from "../../../../components/ui/Badge";
import { LinkButton } from "../../../../components/ui/LinkButton";
import { AdminSectionCard } from "../../AdminSectionCard";

interface Props {
  summary?: MediaAssetProcessingSummary;
  assetId?: string;
  loading?: boolean;
}

export function MediaAssetProcessingSummaryPanel({ summary, assetId, loading }: Props) {
  const requiredOutputs = summary?.requiredOutputs ?? [];
  const optionalOutputs = summary?.optionalOutputs ?? [];
  return (
    <AdminSectionCard title="Asset Processing Summary" description="Required and optional output readiness for the selected media asset.">
      {loading ? <p className="text-sm text-white/60">Loading processing readiness...</p> : null}
      {!loading && summary ? (
        <div className="grid gap-4 text-sm text-white/70">
          <div className="grid gap-3 md:grid-cols-4">
            <div>Status <span className="text-white">{summary.overallStatus}</span></div>
            <div>Progress <span className="text-white">{summary.progress}%</span></div>
            <div>Required <span className="text-white">{summary.requiredOutputsReady ? "Ready" : "Pending"}</span></div>
            <div>Optional <span className="text-white">{summary.optionalOutputsReady ? "Ready" : "Warnings"}</span></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">Required Outputs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredOutputs.map((output) => (
                  <Badge key={output.outputType} variant={output.ready ? "sunrise" : "pink"}>
                    {output.outputType.replace(/_/g, " ")}
                  </Badge>
                ))}
                {!requiredOutputs.length ? <span className="text-xs text-white/45">No required outputs recorded.</span> : null}
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">Optional Outputs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {optionalOutputs.map((output) => (
                  <Badge key={output.outputType} variant={output.ready ? "sunrise" : "neutral"}>
                    {output.outputType.replace(/_/g, " ")}
                  </Badge>
                ))}
                {!optionalOutputs.length ? <span className="text-xs text-white/45">No optional outputs recorded.</span> : null}
              </div>
            </div>
          </div>
          {summary.warnings.length || summary.blockingIssues.length ? (
            <div className="grid gap-2 rounded-md border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">
              {[...summary.blockingIssues, ...summary.warnings].map((message) => <p key={message}>{message}</p>)}
            </div>
          ) : null}
          {assetId ? (
            <div>
              <LinkButton to={`/admin/media?assetId=${assetId}`} variant="ghost" size="sm">
                Open Asset Record
              </LinkButton>
            </div>
          ) : null}
        </div>
      ) : (
        !loading ? <p className="text-sm text-white/60">Open an asset-specific processing report to see readiness details.</p> : null
      )}
    </AdminSectionCard>
  );
}

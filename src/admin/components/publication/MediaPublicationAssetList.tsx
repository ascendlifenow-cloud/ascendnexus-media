import type { MediaPublicationReadinessAsset } from "../../../models/publication";
import { Badge } from "../../../components/ui/Badge";

export function MediaPublicationAssetList({ title, assets }: { title: string; assets: MediaPublicationReadinessAsset[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-white/42">{title}</p>
      <div className="mt-3 grid gap-2">
        {assets.map((asset) => (
          <div key={`${title}-${asset.assetId}`} className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
            <span className="break-all">{asset.assetId}</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant={asset.publicReady ? "sunrise" : asset.classification === "blocked" || asset.classification === "missing" ? "pink" : "neutral"}>{asset.classification.replace(/_/g, " ")}</Badge>
              <Badge variant={asset.processingReady ? "sunrise" : "neutral"}>processing</Badge>
              <Badge variant={asset.storageReady ? "sunrise" : "neutral"}>storage</Badge>
            </div>
          </div>
        ))}
        {!assets.length ? <p className="text-sm text-white/50">None.</p> : null}
      </div>
    </div>
  );
}

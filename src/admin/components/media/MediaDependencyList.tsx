import type { MediaAssetDependency } from "../../../models/media";
import { Badge } from "../../../components/ui/Badge";

interface MediaDependencyListProps {
  dependencies: readonly MediaAssetDependency[];
}

export function MediaDependencyList({ dependencies }: MediaDependencyListProps) {
  if (!dependencies.length) {
    return <p className="rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/56">No linked dependencies detected.</p>;
  }

  return (
    <div className="space-y-2">
      {dependencies.map((dependency) => (
        <div key={dependency.dependencyId} className="rounded-md border border-white/10 bg-black/18 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold capitalize text-white">{dependency.entityLabel ?? dependency.entityType.replace(/_/g, " ")}</p>
              <p className="mt-1 text-xs text-white/52">{dependency.fieldKey} / {dependency.entityId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={dependency.isPublic ? "pink" : "neutral"} className="px-2 py-1 text-[0.68rem]">
                {dependency.isPublic ? "Public" : "Admin"}
              </Badge>
              <Badge variant={dependency.isBlocking ? "pink" : "neutral"} className="px-2 py-1 text-[0.68rem]">
                {dependency.isBlocking ? "Blocking" : dependency.status}
              </Badge>
            </div>
          </div>
          {dependency.publicPath ? <p className="mt-2 text-xs text-white/48">{dependency.publicPath}</p> : null}
        </div>
      ))}
    </div>
  );
}

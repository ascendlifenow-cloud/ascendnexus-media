import { AlertTriangle } from "lucide-react";
import type { MediaAssetDependency } from "../../../models/media";
import { MediaDependencyList } from "./MediaDependencyList";

interface MediaDependencyWarningPanelProps {
  dependencies: readonly MediaAssetDependency[];
}

export function MediaDependencyWarningPanel({ dependencies }: MediaDependencyWarningPanelProps) {
  const publicCount = dependencies.filter((dependency) => dependency.isPublic).length;
  const blockingCount = dependencies.filter((dependency) => dependency.isBlocking).length;

  return (
    <div className="rounded-md border border-anm-pink/25 bg-anm-pink/8 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-anm-pink" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-white">Dependency Safety</p>
          <p className="mt-1 text-sm leading-6 text-white/62">
            This asset is used in {dependencies.length} location{dependencies.length === 1 ? "" : "s"}.
            {publicCount ? ` ${publicCount} public reference${publicCount === 1 ? "" : "s"} must be replaced or detached first.` : " No public references are currently blocking archive."}
          </p>
          {blockingCount ? <p className="mt-1 text-xs text-anm-pink">{blockingCount} blocking dependency{blockingCount === 1 ? "" : "ies"} detected.</p> : null}
        </div>
      </div>
      <div className="mt-3">
        <MediaDependencyList dependencies={dependencies.slice(0, 5)} />
      </div>
    </div>
  );
}


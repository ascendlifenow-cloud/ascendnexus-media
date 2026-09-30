import type { ArtistLinkedAssetReadinessState } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";

interface ArtistLinkedAssetReadinessListProps {
  states: readonly ArtistLinkedAssetReadinessState[];
}

export function ArtistLinkedAssetReadinessList({ states }: ArtistLinkedAssetReadinessListProps) {
  return (
    <div className="grid gap-2">
      {states.map((state) => (
        <div key={state.key} className="rounded-md border border-white/10 bg-black/18 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">{state.label}</p>
              <p className="mt-1 max-w-72 truncate text-xs text-white/48">{state.assetId ?? state.url ?? (state.present ? "Linked" : "Missing")}</p>
            </div>
            <Badge variant={state.blockingIssues.length ? "pink" : state.present ? "sunrise" : "neutral"} className="px-2 py-1 text-[0.68rem]">
              {state.blockingIssues.length ? "Blocked" : state.present ? state.visibility : state.required ? "Required" : "Optional"}
            </Badge>
          </div>
          {state.blockingIssues.length ? <p className="mt-2 text-xs leading-5 text-anm-pink">{state.blockingIssues[0]}</p> : null}
          {!state.blockingIssues.length && state.warnings.length ? <p className="mt-2 text-xs leading-5 text-white/48">{state.warnings[0]}</p> : null}
        </div>
      ))}
    </div>
  );
}


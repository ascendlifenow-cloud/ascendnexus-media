import { Route, Settings2 } from "lucide-react";
import type { AdminHomepageSectionFormState, AdminHomepageSectionFormValidation } from "../../../utils/adminHomepageSectionFormUtils";
import {
  getHomepageSectionPublicVisibilityState,
  homepageSectionTypeLabels,
  normalizeHomepageSectionConfig,
} from "../../../utils/adminHomepageSectionFormUtils";
import { Badge } from "../../../../components/ui/Badge";
import { Card } from "../../../../components/ui/Card";

interface AdminHomepageSectionReadinessPanelProps {
  state: AdminHomepageSectionFormState;
  validation: AdminHomepageSectionFormValidation;
  isDirty: boolean;
}

const visibilityCopy = {
  public: "Public",
  hidden: "Hidden",
  needs_setup: "Needs Setup",
  unsupported_type: "Unsupported Type",
};

export function AdminHomepageSectionReadinessPanel({ state, validation, isDirty }: AdminHomepageSectionReadinessPanelProps) {
  const visibility = getHomepageSectionPublicVisibilityState(state);
  const config = normalizeHomepageSectionConfig(state);
  const configSummary = Object.entries(config).slice(0, 6);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Public Readiness</h2>
        {isDirty ? <Badge variant="sunrise">Unsaved</Badge> : <Badge variant="neutral">Saved</Badge>}
      </div>
      <div className="mt-5 grid gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Section</p>
          <p className="mt-1 break-all text-2xl font-semibold text-white">{state.sectionId || "Missing section ID"}</p>
          <p className="mt-1 text-sm text-white/58">{homepageSectionTypeLabels[state.sectionType]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={visibility === "public" ? "glass" : "sunrise"} className={visibility === "public" ? "text-anm-success" : undefined}>
            {visibilityCopy[visibility]}
          </Badge>
          <Badge variant="neutral">{state.enabled ? "Enabled" : "Disabled"}</Badge>
          <Badge variant="glass">Sort {state.sortOrder || "missing"}</Badge>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/58">
          <Route className="h-4 w-4 text-white/34" aria-hidden />
          Public route: /
        </p>
        {validation.missingFields.length ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Missing Fields</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {validation.missingFields.map((field) => <Badge key={field} variant="neutral">Missing {field}</Badge>)}
            </div>
          </div>
        ) : null}
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/42">
            <Settings2 className="h-4 w-4" aria-hidden />
            Configuration Summary
          </p>
          <dl className="mt-2 grid gap-2 text-sm">
            {configSummary.length ? configSummary.map(([key, value]) => (
              <div key={key} className="rounded-md border border-white/10 bg-black/20 p-2">
                <dt className="text-white/42">{key}</dt>
                <dd className="mt-1 break-all text-white/72">{String(value)}</dd>
              </div>
            )) : <p className="text-white/52">No section-specific configuration.</p>}
          </dl>
        </div>
      </div>
    </Card>
  );
}

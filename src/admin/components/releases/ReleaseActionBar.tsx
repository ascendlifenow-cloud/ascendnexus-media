import { Archive, Check, Eye, Save, UploadCloud, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { ReleaseActionAvailability, ReleaseActionContext, ReleaseEditorAction } from "../../services/releaseEditorTypes";
import { releaseActionAvailabilityService } from "../../services/ReleaseActionAvailabilityService";

interface ReleaseActionBarProps {
  context: ReleaseActionContext;
  onAction: (action: ReleaseEditorAction) => void;
  onClose: () => void;
}

const iconFor: Record<ReleaseEditorAction, typeof Save> = {
  save_draft: Save,
  save_changes: Check,
  save_and_republish: UploadCloud,
  archive: Archive,
  preview: Eye,
  cancel: X,
};

function ActionButton({ action, context, onAction }: { action: ReleaseActionAvailability; context: ReleaseActionContext; onAction: (action: ReleaseEditorAction) => void }) {
  const Icon = iconFor[action.action];
  const loading = context.activeAction === action.action && context.activeOperation !== "idle" && context.activeOperation !== "success" && context.activeOperation !== "error";
  const label = releaseActionAvailabilityService.getActionLabel(action.action, context);
  const variant = action.primary ? "primary" : action.destructive ? "glass" : "glass";
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={!action.enabled}
      isLoading={loading}
      onClick={() => onAction(action.action)}
      title={action.disabledReason}
      aria-label={action.disabledReason ? `${label}. Disabled: ${action.disabledReason}` : label}
    >
      {!loading ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {label}
    </Button>
  );
}

export function ReleaseActionBar({ context, onAction, onClose }: ReleaseActionBarProps) {
  const actions = releaseActionAvailabilityService.getAvailableActions(context);
  const primary = actions.find((action) => action.primary);
  const secondary = actions.filter((action) => !action.primary);
  const blockingCount = context.readiness.blockingIssues.length + context.readiness.missingFields.length;

  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-[#10131d]/96 px-4 py-3 shadow-anm-card backdrop-blur supports-[backdrop-filter]:bg-[#10131d]/82">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-[12rem]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/42">Release Actions</p>
          <p className="text-sm text-white/68">
            {context.form.isDirty ? "Unsaved changes" : "No unsaved changes"} · {blockingCount ? `${blockingCount} blocker${blockingCount === 1 ? "" : "s"}` : "Readiness clear"}
          </p>
        </div>
        {primary ? <ActionButton action={primary} context={context} onAction={onAction} /> : null}
        <div className="flex flex-wrap gap-2">
          {secondary.map((action) => action.action === "cancel"
            ? (
              <Button key={action.action} type="button" variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" aria-hidden />
                Cancel
              </Button>
            )
            : <ActionButton key={action.action} action={action} context={context} onAction={onAction} />)}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {context.activeAction ? releaseActionAvailabilityService.getActionLabel(context.activeAction, context) : "Release action bar ready"}
      </div>
    </div>
  );
}

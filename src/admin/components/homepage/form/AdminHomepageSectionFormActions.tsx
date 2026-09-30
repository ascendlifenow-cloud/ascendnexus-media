import { Check, Eye, Save, ToggleLeft, ToggleRight, X } from "lucide-react";
import type { AdminHomepageSectionFormState } from "../../../utils/adminHomepageSectionFormUtils";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";

interface AdminHomepageSectionFormActionsProps {
  state: AdminHomepageSectionFormState;
  isSaving: boolean;
  isDirty: boolean;
  onSaveDisabled: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AdminHomepageSectionFormActions({ state, isSaving, isDirty, onSaveDisabled, onSave, onCancel }: AdminHomepageSectionFormActionsProps) {
  return (
    <div className="sticky bottom-4 z-10 rounded-anm-panel border border-white/10 bg-anm-surface/95 p-4 shadow-anm-card-glow backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="glass" onClick={onSaveDisabled} disabled={isSaving} isLoading={isSaving}>
          <Save className="h-4 w-4" aria-hidden />
          Save as Disabled
        </Button>
        <Button type="button" variant="primary" onClick={onSave} disabled={isSaving} isLoading={isSaving}>
          <Check className="h-4 w-4" aria-hidden />
          Save Section
        </Button>
        <Button type="button" variant="glass" disabled>
          {state.enabled ? <ToggleLeft className="h-4 w-4" aria-hidden /> : <ToggleRight className="h-4 w-4" aria-hidden />}
          {state.enabled ? "Disable Section" : "Enable Section"}
        </Button>
        <LinkButton to="/admin/preview/homepage" variant="glass">
          <Eye className="h-4 w-4" aria-hidden />
          Preview Homepage
        </LinkButton>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
        {isDirty ? <span className="ml-auto text-sm font-semibold text-anm-gold">Unsaved changes</span> : null}
      </div>
    </div>
  );
}

import { Archive, Check, RotateCcw, Save, ToggleLeft, UploadCloud } from "lucide-react";
import type { PublishingAction } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";

interface PublishingActionButtonsProps {
  actions: readonly PublishingAction[];
  isSaving?: boolean;
  onAction?: (action: PublishingAction) => void;
}

const iconFor = (actionType: PublishingAction["actionType"]) => {
  if (actionType === "archive") return <Archive className="h-4 w-4" aria-hidden />;
  if (actionType === "restore") return <RotateCcw className="h-4 w-4" aria-hidden />;
  if (actionType === "publish" || actionType === "activate") return <UploadCloud className="h-4 w-4" aria-hidden />;
  if (actionType === "enable" || actionType === "disable") return <ToggleLeft className="h-4 w-4" aria-hidden />;
  if (actionType === "save_draft") return <Save className="h-4 w-4" aria-hidden />;
  return <Check className="h-4 w-4" aria-hidden />;
};

export function PublishingActionButtons({ actions, isSaving = false, onAction }: PublishingActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.actionId}
          type="button"
          variant={action.disabled ? "disabled" : action.actionType === "publish" || action.actionType === "activate" || action.actionType === "enable" ? "primary" : "glass"}
          disabled={action.disabled || isSaving}
          title={action.disabledReason}
          onClick={() => onAction?.(action)}
        >
          {iconFor(action.actionType)}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

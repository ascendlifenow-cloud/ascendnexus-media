import type { PublishingAction, PublishingStatus } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";

interface PublishingConfirmationModalProps {
  action: PublishingAction | null;
  status: PublishingStatus;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PublishingConfirmationModal({ action, status, open, onConfirm, onCancel }: PublishingConfirmationModalProps) {
  if (!open || !action) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="publishing-confirm-title">
      <div className="w-full max-w-lg rounded-anm-panel border border-white/12 bg-anm-surface p-5 shadow-anm-card-glow">
        <h2 id="publishing-confirm-title" className="text-xl font-semibold text-white">{action.label}</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Confirm {action.label.toLowerCase()} for {status.entityType.replace(/_/g, " ")} {status.entityId}.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <dt className="text-white/42">From</dt>
            <dd className="text-white">{action.fromStatus}</dd>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <dt className="text-white/42">To</dt>
            <dd className="text-white">{action.toStatus}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="primary" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}

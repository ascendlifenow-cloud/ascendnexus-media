import { Ban } from "lucide-react";
import type { MediaProcessingJob } from "../../../../models/media";
import { Button } from "../../../../components/ui/Button";
import { getProcessingJobActionState } from "../../../utils/mediaProcessingAdminUtils";

interface Props {
  job: MediaProcessingJob;
  onCancel: (processingJobId: string) => void;
  compact?: boolean;
}

export function AdminProcessingCancelButton({ job, onCancel, compact }: Props) {
  const actions = getProcessingJobActionState(job);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!actions.cancelable}
      title={actions.cancelDisabledReason}
      onClick={() => onCancel(job.processingJobId)}
    >
      <Ban className="h-4 w-4" aria-hidden />
      {compact ? "Cancel" : "Cancel Job"}
    </Button>
  );
}

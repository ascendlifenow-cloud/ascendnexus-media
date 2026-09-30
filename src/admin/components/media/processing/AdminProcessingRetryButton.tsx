import { RotateCcw } from "lucide-react";
import type { MediaProcessingJob } from "../../../../models/media";
import { Button } from "../../../../components/ui/Button";
import { getProcessingJobActionState } from "../../../utils/mediaProcessingAdminUtils";

interface Props {
  job: MediaProcessingJob;
  onRetry: (processingJobId: string) => void;
  compact?: boolean;
}

export function AdminProcessingRetryButton({ job, onRetry, compact }: Props) {
  const actions = getProcessingJobActionState(job);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!actions.retryable}
      title={actions.retryDisabledReason}
      onClick={() => onRetry(job.processingJobId)}
    >
      <RotateCcw className="h-4 w-4" aria-hidden />
      {compact ? "Retry" : "Retry Job"}
    </Button>
  );
}

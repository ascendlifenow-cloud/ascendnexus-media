import { RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function MediaUploadRetryButton({ onRetry, disabled = false }: { onRetry: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="glass" size="sm" onClick={onRetry} disabled={disabled}>
      <RotateCcw className="h-4 w-4" aria-hidden />
      Retry
    </Button>
  );
}

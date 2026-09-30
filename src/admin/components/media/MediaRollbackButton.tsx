import { RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function MediaRollbackButton({ onRollback, disabled = false }: { onRollback: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="glass" size="sm" onClick={onRollback} disabled={disabled}>
      <RotateCcw className="h-4 w-4" aria-hidden />
      Rollback
    </Button>
  );
}

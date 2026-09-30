import { X } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function MediaUploadCancelButton({ onCancel, disabled = false }: { onCancel: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="glass" size="sm" onClick={onCancel} disabled={disabled}>
      <X className="h-4 w-4" aria-hidden />
      Cancel
    </Button>
  );
}

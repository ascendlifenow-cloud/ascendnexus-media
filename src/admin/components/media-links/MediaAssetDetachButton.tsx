import { Unlink } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function MediaAssetDetachButton({ onDetach, disabled = false }: { onDetach: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onDetach} disabled={disabled}>
      <Unlink className="h-4 w-4" aria-hidden />
      Detach
    </Button>
  );
}

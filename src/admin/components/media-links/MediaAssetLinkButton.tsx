import { LinkIcon } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function MediaAssetLinkButton({ onClick, disabled = false, label = "Link Asset" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <Button type="button" variant="glass" size="sm" onClick={onClick} disabled={disabled}>
      <LinkIcon className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}

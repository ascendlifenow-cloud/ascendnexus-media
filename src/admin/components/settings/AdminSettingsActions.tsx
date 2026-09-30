import { MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface AdminSettingsActionsProps {
  label: string;
}

export function AdminSettingsActions({ label }: AdminSettingsActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="glass" size="sm" disabled aria-label={`Edit ${label}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </Button>
      <Button type="button" variant="ghost" size="icon" disabled aria-label={`More actions for ${label}`}>
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

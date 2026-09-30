import { X } from "lucide-react";
import { Button } from "../ui/Button";

interface ClearFiltersButtonProps {
  onClear: () => void;
}

export function ClearFiltersButton({ onClear }: ClearFiltersButtonProps) {
  return (
    <Button type="button" variant="glass" size="sm" onClick={onClear} aria-label="Clear all browse filters">
      <X className="h-4 w-4" aria-hidden="true" />
      Clear Filters
    </Button>
  );
}

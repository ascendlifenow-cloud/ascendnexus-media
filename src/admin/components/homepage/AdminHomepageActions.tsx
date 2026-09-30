import { ArrowDown, ArrowUp, Eye, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { PublicSiteConfigSection } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";

interface AdminHomepageActionsProps {
  section: PublicSiteConfigSection;
  onPreview: (section: PublicSiteConfigSection) => void;
  onMoveUp: (sectionId: string) => void;
  onMoveDown: (sectionId: string) => void;
  onToggle: (sectionId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isSaving?: boolean;
}

export function AdminHomepageActions({
  section,
  onPreview,
  onMoveUp,
  onMoveDown,
  onToggle,
  canMoveUp = true,
  canMoveDown = true,
  isSaving = false,
}: AdminHomepageActionsProps) {
  const ToggleIcon = section.enabled ? ToggleRight : ToggleLeft;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="glass" size="sm" onClick={() => onPreview(section)} aria-label={`Preview ${section.sectionId}`}>
        <Eye className="h-4 w-4" aria-hidden />
        Preview
      </Button>
      <LinkButton to={`/admin/homepage/sections/${section.sectionId}/edit`} variant="glass" size="sm" aria-label={`Edit ${section.sectionId}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </LinkButton>
      <Button type="button" variant="glass" size="icon" disabled={!canMoveUp || isSaving} onClick={() => onMoveUp(section.sectionId)} aria-label={`Move ${section.sectionId} up`}>
        <ArrowUp className="h-4 w-4" aria-hidden />
      </Button>
      <Button type="button" variant="glass" size="icon" disabled={!canMoveDown || isSaving} onClick={() => onMoveDown(section.sectionId)} aria-label={`Move ${section.sectionId} down`}>
        <ArrowDown className="h-4 w-4" aria-hidden />
      </Button>
      <Button type="button" variant="glass" size="sm" disabled={isSaving} onClick={() => onToggle(section.sectionId)} aria-label={`Enable or disable ${section.sectionId}`}>
        <ToggleIcon className="h-4 w-4" aria-hidden />
        {section.enabled ? "Disable" : "Enable"}
      </Button>
    </div>
  );
}

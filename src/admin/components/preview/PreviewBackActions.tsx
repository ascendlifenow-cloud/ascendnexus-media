import { ArrowLeft } from "lucide-react";
import { LinkButton } from "../../../components/ui/LinkButton";
import { PreviewPublicLinkButton } from "./PreviewPublicLinkButton";

interface PreviewBackActionsProps {
  backTo: string;
  backLabel?: string;
  publicLink?: string;
  publicSafe: boolean;
}

export function PreviewBackActions({
  backTo,
  backLabel = "Back to Admin",
  publicLink,
  publicSafe,
}: PreviewBackActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton to={backTo} variant="ghost">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </LinkButton>
      <PreviewPublicLinkButton publicLink={publicLink} publicSafe={publicSafe} />
    </div>
  );
}

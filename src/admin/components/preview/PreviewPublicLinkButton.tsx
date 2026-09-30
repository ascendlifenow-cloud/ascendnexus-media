import { ExternalLink } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";

interface PreviewPublicLinkButtonProps {
  publicLink?: string;
  publicSafe: boolean;
}

export function PreviewPublicLinkButton({ publicLink, publicSafe }: PreviewPublicLinkButtonProps) {
  if (!publicSafe || !publicLink) {
    return (
      <Button type="button" variant="disabled" disabled>
        <ExternalLink className="h-4 w-4" aria-hidden />
        Public Page Unavailable
      </Button>
    );
  }

  return (
    <LinkButton to={publicLink} variant="glass">
      <ExternalLink className="h-4 w-4" aria-hidden />
      Open Public Page
    </LinkButton>
  );
}

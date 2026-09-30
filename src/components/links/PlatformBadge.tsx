import type { ExternalLink } from "../../models/ExternalLink";
import { getExternalLinkLabel } from "../../utils/externalLinksUtils";
import { ExternalLinkIcon } from "./ExternalLinkIcon";
import { Badge } from "../ui/Badge";

interface PlatformBadgeProps {
  link: ExternalLink;
}

export function PlatformBadge({ link }: PlatformBadgeProps) {
  return (
    <Badge variant="glass">
      <ExternalLinkIcon platform={link.platform} className="h-3.5 w-3.5" />
      {getExternalLinkLabel(link)}
    </Badge>
  );
}

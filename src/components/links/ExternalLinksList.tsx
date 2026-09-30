import type { ExternalLink } from "../../models/ExternalLink";
import { ExternalLinkButton } from "./ExternalLinkButton";

interface ExternalLinksListProps {
  links: readonly ExternalLink[];
  contextLabel?: string;
  compact?: boolean;
}

export function ExternalLinksList({ links, contextLabel, compact = false }: ExternalLinksListProps) {
  if (links.length === 0) return null;

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
      {links.map((link) => (
        <ExternalLinkButton key={`${link.platform}-${link.url}`} link={link} contextLabel={contextLabel} compact={compact} />
      ))}
    </div>
  );
}

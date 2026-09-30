import { memo } from "react";
import { ExternalLink as ExternalLinkArrow } from "lucide-react";
import type { ExternalLink } from "../../models/ExternalLink";
import { useAnalytics } from "../../hooks/useAnalytics";
import { getExternalLinkLabel, isValidExternalUrl } from "../../utils/externalLinksUtils";
import { ExternalLinkIcon } from "./ExternalLinkIcon";

interface ExternalLinkButtonProps {
  link: ExternalLink;
  contextLabel?: string;
  compact?: boolean;
}

function ExternalLinkButtonComponent({ link, contextLabel, compact = false }: ExternalLinkButtonProps) {
  const analytics = useAnalytics();

  if (link.enabled === false || !isValidExternalUrl(link.url)) return null;

  const label = getExternalLinkLabel(link);
  const ariaLabel = contextLabel ? `Open ${contextLabel} on ${label}` : `Open ${label}`;

  return (
    <a
      href={link.url.trim()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={() => {
        void analytics.trackExternalLinkClick(link, {
          contextLabel: contextLabel ?? null,
        });
      }}
      className="anm-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/14 bg-white/[0.065] px-4 text-sm font-bold text-white transition duration-300 ease-anm-out hover:border-anm-pink/45 hover:bg-white/12 hover:text-white"
    >
      <ExternalLinkIcon platform={link.platform} className={compact ? "h-4 w-4 text-cyanGlow" : "h-4 w-4 text-anm-gold"} />
      <span className="truncate">{label}</span>
      {!compact ? <ExternalLinkArrow className="h-3.5 w-3.5 text-white/48" aria-hidden="true" /> : null}
    </a>
  );
}

export const ExternalLinkButton = memo(ExternalLinkButtonComponent);

import type { ExternalLinksInput } from "../../utils/externalLinksUtils";
import { getVisibleExternalLinks } from "../../utils/externalLinksUtils";
import { ExternalLinksEmptyState } from "./ExternalLinksEmptyState";
import { ExternalLinksList } from "./ExternalLinksList";

interface ExternalLinksPanelProps {
  links?: ExternalLinksInput;
  eyebrow?: string;
  title?: string;
  contextLabel?: string;
  emptyMessage?: string;
  hideWhenEmpty?: boolean;
  compact?: boolean;
}

export function ExternalLinksPanel({
  links,
  eyebrow = "External Links",
  title,
  contextLabel,
  emptyMessage,
  hideWhenEmpty = false,
  compact = false,
}: ExternalLinksPanelProps) {
  const visibleLinks = getVisibleExternalLinks(links);

  if (hideWhenEmpty && visibleLinks.length === 0) return null;

  return (
    <section className={compact ? undefined : "bg-ink py-16 sm:py-20"} aria-label={title ?? eyebrow}>
      <div className={compact ? undefined : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"}>
        <div className={compact ? undefined : "rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-black/20"}>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">{eyebrow}</p>
          {title ? <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h2> : null}
          {visibleLinks.length > 0 ? (
            <div className="mt-6">
              <ExternalLinksList links={visibleLinks} contextLabel={contextLabel} compact={compact} />
            </div>
          ) : (
            <ExternalLinksEmptyState message={emptyMessage} />
          )}
        </div>
      </div>
    </section>
  );
}

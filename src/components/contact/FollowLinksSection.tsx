import type { ExternalLink } from "../../models/ExternalLink";
import { getVisibleExternalLinks } from "../../utils/externalLinksUtils";
import { ExternalLinksPanel } from "../links";
import { SectionContainer } from "../layout/SectionContainer";
import { ContactPageEmptyState } from "./ContactPageEmptyState";

interface FollowLinksSectionProps {
  links: ExternalLink[];
}

export function FollowLinksSection({ links }: FollowLinksSectionProps) {
  const visibleLinks = getVisibleExternalLinks(links);

  return (
    <SectionContainer className="bg-ink py-12 sm:py-16">
      {visibleLinks.length ? (
        <ExternalLinksPanel
          links={visibleLinks}
          eyebrow="Follow Ascend Nexus Media"
          title="Follow the signal wherever it lands"
          contextLabel="Ascend Nexus Media"
          compact
        />
      ) : (
        <div>
          <p className="sr-only">
            Follow Ascend Nexus Media
          </p>
          <ContactPageEmptyState />
        </div>
      )}
    </SectionContainer>
  );
}

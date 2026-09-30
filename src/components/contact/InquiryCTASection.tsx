import { ArrowRight, Mail } from "lucide-react";
import type { ExternalLink } from "../../models/ExternalLink";
import { getVisibleExternalLinks } from "../../utils/externalLinksUtils";
import { SectionContainer } from "../layout/SectionContainer";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { LinkButton } from "../ui/LinkButton";

interface InquiryCTASectionProps {
  body: string;
  links: ExternalLink[];
}

export function InquiryCTASection({ body, links }: InquiryCTASectionProps) {
  const emailLink = getVisibleExternalLinks(links).find((link) => link.platform === "email" || link.url.startsWith("mailto:"));

  return (
    <SectionContainer className="bg-night py-12 sm:py-16" aria-labelledby="inquiry-heading">
      <Card as="section" className="border-white/12 bg-white/[0.055] p-6 sm:p-8" aria-labelledby="inquiry-heading">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Inquiry CTA</p>
        <h2 id="inquiry-heading" className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Interested in Ascend Nexus Media?
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">{body}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {emailLink ? (
            <Button
              type="button"
              size="lg"
              onClick={() => {
                window.location.href = emailLink.url;
              }}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email Contact
            </Button>
          ) : null}
          <LinkButton to="/artists" variant={emailLink ? "secondary" : "primary"} size="lg">
            Explore Artists
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
          <LinkButton to="/#latest-releases" variant="glass" size="lg">
            View Latest Releases
          </LinkButton>
        </div>
      </Card>
    </SectionContainer>
  );
}

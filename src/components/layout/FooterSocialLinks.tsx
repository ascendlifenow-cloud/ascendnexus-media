import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ExternalLinksList } from "../links";
import type { FooterCTAConfig, FooterSocialLink } from "./footerTypes";
import { getFooterExternalLinks } from "./footerUtils";

interface FooterSocialLinksProps {
  links?: FooterSocialLink[];
  cta?: FooterCTAConfig;
}

export function FooterSocialLinks({ links, cta }: FooterSocialLinksProps) {
  const enabledLinks = getFooterExternalLinks(links);

  return (
    <section aria-label="Follow Ascend Nexus Media">
      <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-pink-200">Follow</h2>
      <p className="mt-4 text-sm leading-6 text-white/64">
        Explore the active roster and discover the newest Ascend Nexus Media releases.
      </p>
      {enabledLinks.length > 0 ? (
        <div className="mt-4">
          <ExternalLinksList links={enabledLinks} contextLabel="Ascend Nexus Media" compact />
        </div>
      ) : null}
      {cta && cta.enabled !== false ? (
        <Link
          to={cta.href}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-white/14 bg-white/[0.075] px-4 py-2.5 text-sm font-bold text-white outline-none transition hover:border-amber-200/50 hover:bg-amberGlow hover:text-ink focus-visible:ring-2 focus-visible:ring-cyanGlow/70"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

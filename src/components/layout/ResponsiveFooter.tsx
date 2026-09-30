import { usePublicArtists } from "../../hooks/useArtists";
import { cx } from "../../utils/format";
import { defaultFooterCTA, defaultFooterNavLinks, defaultFooterSocialLinks } from "./footerConfig";
import type { FooterArtistLink, FooterNavLink, FooterSocialLink } from "./footerTypes";
import { getFooterArtistLinks } from "./footerUtils";
import { FooterArtistLinks } from "./FooterArtistLinks";
import { FooterBrand } from "./FooterBrand";
import { FooterCopyrightBar } from "./FooterCopyrightBar";
import { FooterNavLinks } from "./FooterNavLinks";
import { FooterSocialLinks } from "./FooterSocialLinks";

interface ResponsiveFooterProps {
  navLinks?: FooterNavLink[];
  artistLinks?: FooterArtistLink[];
  socialLinks?: FooterSocialLink[];
  showArtistLinks?: boolean;
  showSocialLinks?: boolean;
  className?: string;
}

export function ResponsiveFooter({
  navLinks = defaultFooterNavLinks,
  artistLinks,
  socialLinks = defaultFooterSocialLinks,
  showArtistLinks = true,
  showSocialLinks = true,
  className,
}: ResponsiveFooterProps) {
  const { data: artists } = usePublicArtists();
  const resolvedArtistLinks = artistLinks ?? getFooterArtistLinks(artists, 6);

  return (
    <footer className={cx("border-t border-white/10 bg-anm-bg", className)}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyanGlow/70 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.9fr_0.95fr] lg:px-8">
          <FooterBrand />
          <FooterNavLinks links={navLinks} />
          {showArtistLinks ? <FooterArtistLinks links={resolvedArtistLinks} /> : null}
          {showSocialLinks ? <FooterSocialLinks links={socialLinks} cta={defaultFooterCTA} /> : null}
        </div>
      </div>
      <FooterCopyrightBar />
    </footer>
  );
}

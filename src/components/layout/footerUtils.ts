import type { ArtistPublicProfile } from "../../models/artist";
import type { ExternalLink } from "../../models/ExternalLink";
import { getVisibleExternalLinks } from "../../utils/externalLinksUtils";
import type { FooterArtistLink, FooterNavLink, FooterSocialLink } from "./footerTypes";

export const getEnabledFooterNavLinks = (links: readonly FooterNavLink[] | undefined): FooterNavLink[] =>
  (links ?? []).filter((link) => link.enabled !== false);

export const getEnabledSocialLinks = (links: readonly FooterSocialLink[] | undefined): FooterSocialLink[] =>
  (links ?? []).filter((link) => link.enabled !== false && Boolean(link.href));

export const getFooterExternalLinks = (links: readonly FooterSocialLink[] | undefined): ExternalLink[] =>
  getVisibleExternalLinks(
    (links ?? []).filter(link => {
      try {
        const host = new URL(link.href).hostname.toLowerCase();
        return !["example.com", "example.org", "example.net"].some(domain => host === domain || host.endsWith(`.${domain}`));
      } catch {
        return false;
      }
    }).map((link, index) => ({
      platform: link.platform,
      label: link.label,
      url: link.href,
      enabled: link.enabled,
      sortOrder: index,
    })),
  );

export const getFooterArtistLinks = (
  artists: readonly ArtistPublicProfile[] | undefined,
  limit = 6,
): FooterArtistLink[] =>
  (artists ?? [])
    .filter((artist) => artist.status === "active" && Boolean(artist.slug))
    .slice(0, Math.max(0, limit))
    .map((artist) => ({
      label: artist.displayName,
      href: `/artists/${artist.slug}`,
      enabled: true,
    }));

export const isInternalHref = (href: string) => href.startsWith("/");

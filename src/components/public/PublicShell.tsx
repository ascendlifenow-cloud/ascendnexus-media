import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ApplicationShell } from "../authShell/ApplicationShell";
import { usePublicSiteConfig } from "../../hooks/public";
import { authShellChangedEvent, authenticationShellService, type AuthenticationShellIdentity } from "../../services/auth/AuthenticationShellService";
import type { PublicNavLink } from "../layout/headerTypes";
import type { FooterNavLink, FooterSocialLink } from "../layout/footerTypes";
import { ResponsiveFooter } from "../ResponsiveFooter";
import { PublicGlobalAudioPlayer } from "../audio/PublicAudioPlayer";
import { PublicConsentBanner } from "../privacy/PublicConsentBanner";
import { PublicPrivacyChoicesButton } from "../privacy/PublicPrivacyChoicesButton";
import { PublicSkipLink } from "./PublicSkipLink";

interface PublicSiteNavigationItem {
  label?: string;
  href?: string;
  url?: string;
  enabled?: boolean;
  sortOrder?: number;
}

interface PublicSiteConfiguration {
  siteName?: string;
  siteDescription?: string;
  navigation?: PublicSiteNavigationItem[];
  footer?: {
    links?: PublicSiteNavigationItem[];
    copyright?: string;
  };
  socialLinks?: Record<string, string> | Array<{ platform?: string; label?: string; url?: string; href?: string; enabled?: boolean; sortOrder?: number }>;
}

interface PublicSiteSocialLink {
  platform?: string;
  label?: string;
  url?: string;
  href?: string;
  enabled?: boolean;
  sortOrder?: number;
}

const isSafePublicHref = (href: string): boolean => {
  if (href.startsWith("/")) return !href.startsWith("/admin") && !href.startsWith("/api") && !href.includes("..");
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
};

const toNavLinks = (items: PublicSiteNavigationItem[] | undefined): PublicNavLink[] =>
  [...(items ?? [])]
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({ label: item.label?.trim() ?? "", href: (item.href ?? item.url ?? "").trim(), enabled: item.enabled !== false }))
    .filter((item) => item.label && item.href && isSafePublicHref(item.href));

const toFooterLinks = (items: PublicSiteNavigationItem[] | undefined): FooterNavLink[] =>
  toNavLinks(items).map((item) => ({ label: item.label, href: item.href, enabled: item.enabled }));

const ensurePublicAccountLinks = <T extends { label: string; href: string; enabled?: boolean }>(items: T[]): T[] => {
  const hasLogin = items.some((item) => item.href === "/login");
  const hasRegister = items.some((item) => item.href === "/register");
  return [
    ...items,
    ...(!hasLogin ? [{ label: "Sign In", href: "/login", enabled: true } as T] : []),
    ...(!hasRegister ? [{ label: "Join", href: "/register", enabled: true } as T] : []),
  ];
};

const ensurePublicArtworkLink = <T extends { label: string; href: string; enabled?: boolean }>(items: T[]): T[] => {
  const hasArtwork = items.some((item) => item.href === "/artwork" || item.href === "/artwork-collage");
  if (hasArtwork) return items;
  const artworkLink = { label: "Artwork", href: "/artwork", enabled: true } as T;
  const accountStartIndex = items.findIndex((item) => item.href === "/login" || item.href === "/register");
  if (accountStartIndex < 0) return [...items, artworkLink];
  return [...items.slice(0, accountStartIndex), artworkLink, ...items.slice(accountStartIndex)];
};

const toSocialLinks = (socialLinks: PublicSiteConfiguration["socialLinks"]): FooterSocialLink[] => {
  const links: PublicSiteSocialLink[] = Array.isArray(socialLinks)
    ? socialLinks
    : Object.entries(socialLinks ?? {}).map(([platform, url]) => ({ platform, label: platform, url }));
  return links
    .filter((link) => link.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((link) => ({
      platform: link.platform ?? link.label ?? "custom",
      label: link.label ?? link.platform ?? "Social link",
      href: (link.href ?? link.url ?? "").trim(),
      enabled: link.enabled !== false,
    }))
    .filter((link) => link.href && isSafePublicHref(link.href));
};

export function PublicShell() {
  const { data } = usePublicSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState<AuthenticationShellIdentity>({ kind: "guest" });
  const [identityLoading, setIdentityLoading] = useState(true);
  const siteConfig = data as PublicSiteConfiguration | undefined;
  const guestNavLinks = useMemo(() => ensurePublicAccountLinks(ensurePublicArtworkLink(toNavLinks(siteConfig?.navigation))), [siteConfig?.navigation]);
  const memberNavLinks = useMemo<PublicNavLink[]>(() => [
    { label: "Dashboard", href: "/member", enabled: true, matchPaths: ["/member"] },
    { label: "Home", href: "/member/home", enabled: true, matchPaths: ["/member/home"] },
    { label: "Artists", href: "/member/artists", enabled: true, matchPaths: ["/member/artists"] },
    { label: "Songs", href: "/member/songs", enabled: true, matchPaths: ["/member/songs"] },
    { label: "Artwork", href: "/member/artwork", enabled: true, matchPaths: ["/member/artwork"] },
    { label: "Profile", href: "/member/profile", enabled: true, matchPaths: ["/member/profile"] },
    { label: "Membership", href: "/member/membership", enabled: true, matchPaths: ["/member/membership"] },
    { label: "Security", href: "/member/security", enabled: true, matchPaths: ["/member/security"] },
    { label: "Logout", href: "/logout", enabled: true, matchPaths: ["/logout"] },
  ], []);
  const navLinks = identity.kind === "member" ? memberNavLinks : guestNavLinks;
  const footerLinks = useMemo(() => ensurePublicAccountLinks(ensurePublicArtworkLink(toFooterLinks(siteConfig?.footer?.links ?? siteConfig?.navigation))), [siteConfig?.footer?.links, siteConfig?.navigation]);
  const socialLinks = useMemo(() => toSocialLinks(siteConfig?.socialLinks), [siteConfig?.socialLinks]);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      setIdentityLoading(true);
      const nextIdentity = await authenticationShellService.getCurrentIdentity();
      if (!active) return;
      setIdentity(nextIdentity);
      setIdentityLoading(false);
      if (nextIdentity.kind === "member") {
        const authenticatedRoute = authenticationShellService.getAuthenticatedRoute(location.pathname);
        if (authenticatedRoute) navigate(authenticatedRoute, { replace: true });
      }
    };
    void sync();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === authShellChangedEvent) void sync();
    };
    window.addEventListener(authShellChangedEvent, sync);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener(authShellChangedEvent, sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-ink text-white">
      <PublicSkipLink />
      <ApplicationShell identity={identity} navLinks={navLinks.length ? navLinks : []} cta={identity.kind === "member" ? { label: "", href: "", enabled: false } : undefined} loading={identityLoading}>
        <div id="public-main">
          <Outlet />
        </div>
      </ApplicationShell>
      <PublicGlobalAudioPlayer />
      <ResponsiveFooter navLinks={footerLinks.length ? footerLinks : undefined} socialLinks={socialLinks} showSocialLinks={socialLinks.length > 0} />
      <PublicConsentBanner />
      <PublicPrivacyChoicesButton />
    </div>
  );
}

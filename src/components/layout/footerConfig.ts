import type { FooterCTAConfig, FooterNavLink, FooterSocialLink } from "./footerTypes";

export const defaultFooterNavLinks: FooterNavLink[] = [
  { label: "Home", href: "/", enabled: true },
  { label: "Artists", href: "/artists", enabled: true },
  { label: "Latest Releases", href: "/#latest-releases", enabled: true },
  { label: "About", href: "/#about", enabled: true },
  { label: "Songs", href: "/songs", enabled: false },
  { label: "Gallery", href: "/gallery", enabled: false },
  { label: "Contact", href: "/contact", enabled: false },
  { label: "Sign In", href: "/login", enabled: true },
  { label: "Join", href: "/register", enabled: true },
];

export const defaultFooterSocialLinks: FooterSocialLink[] = [];

export const defaultFooterCTA: FooterCTAConfig = {
  label: "Explore the Music",
  href: "/artists",
  enabled: true,
};

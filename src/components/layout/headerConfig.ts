import type { HeaderCTAConfig, PublicNavLink } from "./headerTypes";

export const defaultPublicNavLinks: PublicNavLink[] = [
  { label: "Home", href: "/", enabled: true, matchPaths: ["/"] },
  { label: "Artists", href: "/artists", enabled: true, matchPaths: ["/artists"] },
  { label: "Artwork", href: "/artwork", enabled: true, matchPaths: ["/artwork", "/artwork-collage"] },
  { label: "Latest Releases", href: "/#latest-releases", enabled: true, matchPaths: ["/#latest-releases"] },
  { label: "About", href: "/#about", enabled: true, matchPaths: ["/#about"] },
  { label: "Songs", href: "/songs", enabled: false, matchPaths: ["/songs"] },
  { label: "Gallery", href: "/gallery", enabled: false, matchPaths: ["/gallery"] },
  { label: "Contact", href: "/contact", enabled: false, matchPaths: ["/contact"] },
  { label: "Sign In", href: "/login", enabled: true, matchPaths: ["/login"] },
];

export const defaultHeaderCTA: HeaderCTAConfig = {
  label: "Join",
  href: "/register",
  enabled: true,
};

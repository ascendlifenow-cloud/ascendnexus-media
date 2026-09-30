import type { Location } from "react-router-dom";
import type { PublicNavLink } from "./headerTypes";

export const getEnabledNavLinks = (links: readonly PublicNavLink[] | undefined): PublicNavLink[] =>
  (links ?? []).filter((link) => link.enabled !== false);

export const isHashHref = (href: string) => href.includes("#");

export const isNavLinkActive = (link: PublicNavLink, location: Location): boolean => {
  const candidates = link.matchPaths?.length ? link.matchPaths : [link.href];
  return candidates.some((candidate) => {
    const [candidatePath, candidateHash = ""] = candidate.split("#");
    const normalizedPath = candidatePath || "/";
    const normalizedHash = candidateHash ? `#${candidateHash}` : "";

    if (normalizedHash) {
      return location.pathname === normalizedPath && location.hash === normalizedHash;
    }

    if (normalizedPath === "/") {
      return location.pathname === "/" && !location.hash;
    }

    return location.pathname === normalizedPath || location.pathname.startsWith(`${normalizedPath}/`);
  });
};

export const scrollHashIntoView = (hash: string) => {
  if (!hash) return;
  window.requestAnimationFrame(() => {
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

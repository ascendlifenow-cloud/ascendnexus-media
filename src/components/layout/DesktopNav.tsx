import type { PublicNavLink } from "./headerTypes";
import { NavLinkItem } from "./NavLinkItem";

interface DesktopNavProps {
  links: PublicNavLink[];
}

export function DesktopNav({ links }: DesktopNavProps) {
  if (links.length === 0) return null;

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
      {links.map((link) => (
        <NavLinkItem key={link.href} link={link} />
      ))}
    </nav>
  );
}

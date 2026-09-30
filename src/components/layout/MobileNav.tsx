import type { HeaderCTAConfig, PublicNavLink } from "./headerTypes";
import { HeaderCTA } from "./HeaderCTA";
import { NavLinkItem } from "./NavLinkItem";
import { NavLogo } from "./NavLogo";

interface MobileNavProps {
  id: string;
  open: boolean;
  links: PublicNavLink[];
  cta?: HeaderCTAConfig;
  onNavigate: () => void;
}

export function MobileNav({ id, open, links, cta, onNavigate }: MobileNavProps) {
  return (
    <div
      id={id}
      className={open ? "border-t border-white/10 bg-ink/96 px-4 py-4 shadow-2xl backdrop-blur-2xl md:hidden" : "hidden"}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <NavLogo onNavigate={onNavigate} className="px-1" />
        {links.length > 0 ? (
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {links.map((link) => (
              <NavLinkItem key={link.href} link={link} variant="mobile" onNavigate={onNavigate} />
            ))}
          </nav>
        ) : null}
        <HeaderCTA cta={cta} onNavigate={onNavigate} className="mt-1 w-full" />
      </div>
    </div>
  );
}

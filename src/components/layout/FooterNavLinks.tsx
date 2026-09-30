import type { FooterNavLink } from "./footerTypes";
import { getEnabledFooterNavLinks } from "./footerUtils";
import { FooterLink } from "./FooterLink";

interface FooterNavLinksProps {
  links?: FooterNavLink[];
}

export function FooterNavLinks({ links }: FooterNavLinksProps) {
  const enabledLinks = getEnabledFooterNavLinks(links);
  if (enabledLinks.length === 0) return null;

  return (
    <nav aria-label="Footer navigation">
      <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Navigate</h2>
      <ul className="mt-4 grid gap-1">
        {enabledLinks.map((link) => (
          <li key={link.href}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

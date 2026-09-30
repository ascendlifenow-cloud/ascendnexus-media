import type { FooterArtistLink } from "./footerTypes";
import { FooterLink } from "./FooterLink";

interface FooterArtistLinksProps {
  links: FooterArtistLink[];
}

export function FooterArtistLinks({ links }: FooterArtistLinksProps) {
  return (
    <nav aria-label="Footer artist links">
      <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Artists</h2>
      {links.length > 0 ? (
        <ul className="mt-4 grid gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <FooterLink href={link.href}>{link.label}</FooterLink>
            </li>
          ))}
        </ul>
      ) : null}
      <FooterLink href="/artists" className="mt-3 font-semibold text-white">
        View All Artists
      </FooterLink>
    </nav>
  );
}

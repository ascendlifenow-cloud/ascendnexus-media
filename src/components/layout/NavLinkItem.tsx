import { Link, useLocation } from "react-router-dom";
import { cx } from "../../utils/format";
import type { PublicNavLink } from "./headerTypes";
import { isHashHref, isNavLinkActive, scrollHashIntoView } from "./headerUtils";

interface NavLinkItemProps {
  link: PublicNavLink;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}

export function NavLinkItem({ link, onNavigate, variant = "desktop" }: NavLinkItemProps) {
  const location = useLocation();
  const active = isNavLinkActive(link, location);

  const handleClick = () => {
    onNavigate?.();
    if (isHashHref(link.href)) {
      const [path, hash] = link.href.split("#");
      if ((path || "/") === location.pathname) {
        scrollHashIntoView(`#${hash}`);
      }
    }
  };

  return (
    <Link
      to={link.href}
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "rounded-md font-medium transition anm-focus",
        variant === "desktop" && "px-4 py-2 text-sm",
        variant === "mobile" && "px-4 py-3 text-base",
        active
          ? "border border-white/14 bg-white/14 text-white shadow-anm-soft-glow"
          : "text-white/72 hover:bg-white/10 hover:text-white",
      )}
    >
      {link.label}
    </Link>
  );
}

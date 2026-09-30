import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useLocation } from "react-router-dom";
import { GuestAccessBadge } from "../authShell/GuestAccessBadge";
import { IdentityBadge } from "../authShell/IdentityBadge";
import { MembershipBadge } from "../authShell/MembershipBadge";
import type { AuthenticationShellIdentity } from "../../services/auth/AuthenticationShellService";
import { useNavigationStore } from "../../store/navigationStore";
import { cx } from "../../utils/format";
import { defaultHeaderCTA, defaultPublicNavLinks } from "./headerConfig";
import type { HeaderCTAConfig, PublicNavLink } from "./headerTypes";
import { getEnabledNavLinks, scrollHashIntoView } from "./headerUtils";
import { HeaderCTA } from "./HeaderCTA";
import { NavLinkItem } from "./NavLinkItem";
import { NavLogo } from "./NavLogo";

interface ResponsiveHeaderProps {
  navLinks?: PublicNavLink[];
  cta?: HeaderCTAConfig;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
  identity?: AuthenticationShellIdentity;
}

export function ResponsiveHeader({
  navLinks = defaultPublicNavLinks,
  cta = defaultHeaderCTA,
  sticky = true,
  transparent = false,
  className,
  identity = { kind: "guest" },
}: ResponsiveHeaderProps) {
  const { mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useNavigationStore();
  const location = useLocation();
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const enabledLinks = getEnabledNavLinks(navLinks);

  useEffect(() => {
    setMobileMenuOpen(false);
    if (location.hash) {
      scrollHashIntoView(location.hash);
    }
  }, [location.pathname, location.hash, setMobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !headerRef.current?.contains(target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  return (
    <header
      ref={headerRef}
      className={cx(
        sticky ? "fixed inset-x-0 top-0 z-50" : "relative z-40",
        "border-b border-anm-border shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl",
        transparent ? "bg-anm-bg/54" : "bg-anm-bg/78",
        className,
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/8 text-white transition hover:border-cyanGlow/45 hover:bg-white/12 anm-focus"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls={menuId}
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
          <NavLogo onNavigate={() => setMobileMenuOpen(false)} />
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          {identity.kind === "member" ? (
            <>
              <IdentityBadge label={identity.displayName} className="max-w-[9rem] sm:max-w-[14rem]" />
              <MembershipBadge label={identity.membershipTier} className="hidden max-w-[10rem] sm:inline-flex" />
            </>
          ) : (
            <>
              <GuestAccessBadge />
              <HeaderCTA cta={cta} onNavigate={() => setMobileMenuOpen(false)} className="hidden sm:inline-flex" />
            </>
          )}
        </div>
      </div>
      <div
        id={menuId}
        className={mobileMenuOpen ? "border-t border-white/10 bg-ink/96 px-4 py-4 shadow-2xl backdrop-blur-2xl" : "hidden"}
      >
        <div className="mx-auto max-w-7xl">
          {enabledLinks.length > 0 ? (
            <nav className="grid gap-2 sm:grid-cols-2 lg:max-w-md" aria-label={identity.kind === "member" ? "Member navigation" : "Guest navigation"}>
              {enabledLinks.map((link) => (
                <NavLinkItem key={link.href} link={link} variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
              ))}
            </nav>
          ) : null}
          {identity.kind !== "member" ? <HeaderCTA cta={cta} onNavigate={() => setMobileMenuOpen(false)} className="mt-4 w-full sm:hidden" /> : null}
        </div>
      </div>
    </header>
  );
}

import type { ReactNode } from "react";
import type { HeaderCTAConfig, PublicNavLink } from "../layout/headerTypes";
import { ResponsiveHeader } from "../ResponsiveHeader";
import type { AuthenticationShellIdentity } from "../../services/auth/AuthenticationShellService";
import { AuthenticationTransition } from "./AuthenticationTransition";

interface ApplicationShellProps {
  identity: AuthenticationShellIdentity;
  navLinks: PublicNavLink[];
  cta?: HeaderCTAConfig;
  loading?: boolean;
  children: ReactNode;
}

export function GuestNavigation() {
  return null;
}

export function MemberNavigation() {
  return null;
}

export function NavigationDropdown() {
  return null;
}

export function ApplicationShell({ identity, navLinks, cta, loading = false, children }: ApplicationShellProps) {
  return (
    <>
      <AuthenticationTransition loading={loading} />
      <ResponsiveHeader navLinks={navLinks} cta={cta} identity={identity} />
      {children}
    </>
  );
}

import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { memberAuthApiService } from "../../services/member/MemberAuthApiService";
import { Button } from "../../components/ui/Button";
import { IdentityBadge } from "../../components/authShell/IdentityBadge";
import { MembershipBadge } from "../../components/authShell/MembershipBadge";
import { buildMemberNavigation } from "../navigation/memberNavigation";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { authenticationShellService } from "../../services/auth/AuthenticationShellService";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${isActive ? "bg-cyanGlow/18 text-white" : "text-white/68 hover:bg-white/8 hover:text-white"}`;

export function MemberLayout() {
  const navigate = useNavigate();
  const { session, dashboard } = useMemberPortal();
  const [open, setOpen] = useState(false);
  const nav = buildMemberNavigation(dashboard);
  const logout = async () => {
    await memberAuthApiService.logout().catch(() => undefined);
    authenticationShellService.announceAuthChange();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-night text-white">
      <a href="#member-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-night">Skip to member content</a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-night/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              className="rounded-md border border-white/10 bg-white/8 p-2 text-white transition hover:border-cyanGlow/50 hover:bg-white/12"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close member navigation" : "Open member navigation"}
              aria-expanded={open}
              aria-controls="member-navigation-dropdown"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to="/member" className="text-lg font-semibold tracking-wide">Ascend Nexus Member</Link>
          </div>
          <div className="flex items-center gap-3">
            <IdentityBadge label={session.member.displayName} className="hidden max-w-[12rem] sm:inline-flex" />
            <MembershipBadge label={dashboard.membership?.name ?? session.member.membershipTier} className="max-w-[10rem]" />
            <Button variant="secondary" size="sm" onClick={logout}><LogOut size={16} aria-hidden /> Logout</Button>
          </div>
        </div>
        {open ? (
          <div id="member-navigation-dropdown" className="border-t border-white/10 bg-night/98 px-4 py-4 shadow-2xl">
            <nav className="mx-auto grid max-w-7xl gap-2 sm:grid-cols-2 lg:max-w-lg" aria-label="Member navigation">
              {nav.map((item) => {
                const Icon = item.icon;
                return <NavLink key={item.navigationKey} to={item.path} end={item.path === "/member"} className={navClass} onClick={() => setOpen(false)}><Icon size={17} aria-hidden /><span>{item.label}</span>{item.featureStatus === "coming_soon" ? <span className="ml-auto text-[10px] uppercase text-white/38">soon</span> : null}</NavLink>;
              })}
              <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/68 transition hover:bg-white/8 hover:text-white" onClick={() => setOpen(false)}>Public site</Link>
            </nav>
          </div>
        ) : null}
      </header>
      <div className="mx-auto max-w-7xl">
        <main id="member-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

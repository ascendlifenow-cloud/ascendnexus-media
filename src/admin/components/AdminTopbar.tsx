import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../hooks/useAdminAuth";

interface AdminTopbarProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}

export function AdminTopbar({ mobileNavOpen, onToggleMobileNav }: AdminTopbarProps) {
  const { session, logout } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-anm-bg/88 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-anm-blue">Internal</p>
          <p className="text-sm font-semibold text-white/72">Ascend Nexus Media Admin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-anm-success/25 bg-anm-success/10 px-3 py-2 text-xs font-semibold text-anm-success sm:inline-flex">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {session?.user.displayName ?? "Admin"}
          </div>
          <Button type="button" variant="glass" size="sm" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Button>
          <Button
            type="button"
            variant="glass"
            size="icon"
            className="lg:hidden"
            aria-label={mobileNavOpen ? "Close admin navigation" : "Open admin navigation"}
            onClick={onToggleMobileNav}
          >
            {mobileNavOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>
    </header>
  );
}

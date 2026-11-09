import { useState } from "react";
import { Search, X } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { cx } from "../../utils/format";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAdminNavigationBadges } from "../hooks/useAdminNavigationBadges";
import { useAdminSidebar } from "../hooks/useAdminSidebar";
import { getAdminNavigationGroups } from "../navigation/AdminNavigationRegistry";
import { AdminSidebarGroup } from "./navigation/AdminSidebarGroup";
import { AdminSidebarToggle } from "./navigation/AdminSidebarToggle";

interface AdminSidebarProps {
  onNavigate?: () => void;
  mobile?: boolean;
}

export function AdminSidebar({ onNavigate, mobile = false }: AdminSidebarProps) {
  const { session, hasPermission } = useAdminAuth();
  const sidebar = useAdminSidebar();
  const badges = useAdminNavigationBadges();
  const mode = mobile ? "expanded" : sidebar.mode;
  const expanded = mode === "expanded";
  const [search, setSearch] = useState("");
  const term = expanded ? search.trim().toLowerCase() : "";
  const groups = getAdminNavigationGroups(hasPermission)
    .map((group) => ({ ...group, entries: group.entries.filter((entry) => !term || `${group.label} ${entry.label}`.toLowerCase().includes(term)) }))
    .filter((group) => group.entries.length);

  return (
    <aside
      className={cx(
        "flex h-full flex-col border-r border-white/10 bg-anm-bg-soft/96 py-5 transition-[width,padding] duration-200 ease-anm-out motion-reduce:transition-none",
        expanded ? "w-[var(--admin-sidebar-expanded-width)] px-4" : "w-[var(--admin-sidebar-collapsed-width)] px-2",
      )}
      data-sidebar-mode={mode}
    >
      <div className={cx("flex items-start gap-3", expanded ? "px-1" : "justify-center px-0")}>
        {expanded ? <BrandLogo /> : <div className="flex h-10 w-10 items-center justify-center rounded-md border border-anm-pink/35 bg-anm-pink/10 text-sm font-black text-white">AN</div>}
      </div>
      <div className={cx("mt-4 flex items-center", expanded ? "justify-between px-1" : "justify-center")}>
        {expanded ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Admin Portal</p> : null}
        {!mobile ? <AdminSidebarToggle mode={mode} onToggle={sidebar.toggle} /> : null}
      </div>
      {expanded ? <div className="relative mt-4">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/45" />
        <input aria-label="Find admin page" placeholder="Find a page" value={search} onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-full rounded-md border border-white/15 bg-black/20 pl-9 pr-9 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-anm-gold" />
        {search ? <button type="button" aria-label="Clear menu search" title="Clear menu search" onClick={() => setSearch("")}
          className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-white/70"><X aria-hidden className="h-4 w-4" /></button> : null}
      </div> : null}
      <nav className="mt-4 min-h-0 flex-1 content-start grid gap-3 overflow-y-auto pr-1" aria-label="Admin navigation">
        {!groups.length ? <p role="status" className="px-3 text-sm text-white/60">No matching pages.</p> : null}
        {groups.map((group) => (
          <AdminSidebarGroup key={group.groupKey} group={group} mode={mode} badges={badges} forceExpanded={Boolean(term)} onNavigate={onNavigate} />
        ))}
      </nav>
      <div
        className={cx(
          "mt-auto rounded-md border border-white/10 bg-white/[0.055] text-xs leading-5 text-white/56",
          expanded ? "p-3" : "flex h-10 items-center justify-center p-0",
        )}
        title={`Signed in as ${session?.user.displayName ?? "Admin"}`}
      >
        {expanded ? (
          <>
            Signed in as <span className="font-semibold text-white/78">{session?.user.displayName ?? "Admin"}</span>
          </>
        ) : (
          <span aria-label={`Signed in as ${session?.user.displayName ?? "Admin"}`} className="font-bold text-white/72">
            {(session?.user.displayName ?? "A").slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    </aside>
  );
}
